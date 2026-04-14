import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { HttpsProxyAgent } from 'https-proxy-agent';
import nodeFetch from 'node-fetch';
import { config } from 'dotenv';
import sharp from 'sharp';

config(); // 加载 .env

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3004;
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY || '';
const DASHSCOPE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
const DASHSCOPE_IMG_SYNTHESIS_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/image2image/image-synthesis';
const DASHSCOPE_T2I_URL = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis';
const DASHSCOPE_TASK_URL = 'https://dashscope.aliyuncs.com/api/v1/tasks';

app.use(express.json({ limit: '20mb' }));

// 健康检查
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// 阿里云百炼 Qwen-VL 审核接口
app.post('/api/qwen-audit', async (req, res) => {
  try {
    const { prompt, imageBase64, mimeType } = req.body;
    const response = await nodeFetch(DASHSCOPE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen-vl-plus',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          ],
        }],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data });
    }
    const text = data.choices?.[0]?.message?.content || '';
    res.json({ text });
  } catch (err) {
    console.error('[Qwen-VL Audit]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 文生图 - DashScope wanx2.1-t2i-turbo
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt, size = '1024*1024', n = 1 } = req.body;
    if (!prompt) return res.status(400).json({ error: '缺少 prompt' });

    const submitRes = await nodeFetch(DASHSCOPE_T2I_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wanx2.1-t2i-turbo',
        input: { prompt },
        parameters: { size, n },
      }),
    });

    const submitData = await submitRes.json();
    if (!submitRes.ok) {
      console.error('[Generate Image] Submit failed:', submitData);
      return res.status(submitRes.status).json({ error: submitData });
    }

    const taskId = submitData.output?.task_id;
    if (!taskId) return res.status(500).json({ error: '未获取到 task_id', detail: submitData });

    console.log('[Generate Image] Task submitted:', taskId);

    // 轮询结果（每 4 秒，最多 120 秒）
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 4000));
      const pollRes = await nodeFetch(`${DASHSCOPE_TASK_URL}/${taskId}`, {
        headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}` },
      });
      const pollData = await pollRes.json();
      const status = pollData.output?.task_status;
      console.log('[Generate Image] Poll status:', status);

      if (status === 'SUCCEEDED') {
        const results = pollData.output?.results || [];
        const urls = results.map(r => r.url).filter(Boolean);
        if (!urls.length) return res.status(500).json({ error: 'SUCCEEDED 但未找到图片 url', detail: pollData.output });
        return res.json({ urls, taskId });
      }
      if (status === 'FAILED') {
        console.error('[Generate Image] FAILED:', pollData.output?.code, pollData.output?.message);
        return res.status(500).json({ error: '任务失败', code: pollData.output?.code, message: pollData.output?.message });
      }
    }

    res.status(504).json({ error: '任务超时（超过 120 秒）' });
  } catch (err) {
    console.error('[Generate Image]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 图片延展 (outpainting) - DashScope wanx2.1-imageedit inpainting
app.post('/api/extend-image', async (req, res) => {
  try {
    const { imageBase64, mimeType, targetWidth, targetHeight, sourceWidth, sourceHeight } = req.body;
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: '缺少 imageBase64 或 mimeType' });
    }

    const tw = parseInt(targetWidth) || parseInt(sourceWidth);
    const th = parseInt(targetHeight) || parseInt(sourceHeight);
    const sw = parseInt(sourceWidth);
    const sh = parseInt(sourceHeight);

    if (!tw || !th || tw < 64 || th < 64) {
      return res.status(400).json({ error: `目标尺寸无效: ${tw}x${th}` });
    }

    console.log('[Extend Image] params:', { mimeType, tw, th, sw, sh, base64Len: imageBase64?.length });

    const srcBuf = Buffer.from(imageBase64, 'base64');

    // 计算原图在目标画布中居中放置的位置（等比缩放，不超过目标尺寸）
    const scale = Math.min(tw / sw, th / sh, 1); // 原图已小于目标则不放大
    const scaledW = Math.round(sw * scale);
    const scaledH = Math.round(sh * scale);
    const left = Math.round((tw - scaledW) / 2);
    const top = Math.round((th - scaledH) / 2);

    // 从原图四边各取1px，模糊后作为画布背景色，帮助模型延续边缘内容
    const edgeSample = await sharp(srcBuf)
      .resize(scaledW, scaledH)
      .blur(40)
      .resize(1, 1)
      .raw()
      .toBuffer();
    const bgColor = { r: edgeSample[0], g: edgeSample[1], b: edgeSample[2] };

    // 生成画布图：原图居中，四周填充从原图采样的背景色
    const canvasBuf = await sharp({
      create: { width: tw, height: th, channels: 3, background: bgColor }
    })
      .composite([{
        input: await sharp(srcBuf).resize(scaledW, scaledH).toBuffer(),
        left,
        top,
      }])
      .png()
      .toBuffer();

    // 生成 mask：白色=需要AI填充，黑色=保留原图
    const maskBuf = await sharp({
      create: { width: tw, height: th, channels: 3, background: { r: 255, g: 255, b: 255 } }
    })
      .composite([{
        input: await sharp({
          create: { width: scaledW, height: scaledH, channels: 3, background: { r: 0, g: 0, b: 0 } }
        }).png().toBuffer(),
        left,
        top,
      }])
      .png()
      .toBuffer();

    const canvasDataUrl = `data:image/png;base64,${canvasBuf.toString('base64')}`;
    const maskDataUrl = `data:image/png;base64,${maskBuf.toString('base64')}`;

    const prompt = `Seamlessly extend the background and existing content outward. Only continue the existing textures, patterns, colors, gradients, and environment that are already present in the image. Do not add any new objects, characters, logos, text, or elements that are not already in the original image. Keep identical lighting, color tone, and visual style throughout.`;

    console.log('[Extend Image] canvas:', tw, 'x', th, '| original scaled to:', scaledW, 'x', scaledH, 'at', left, top);

    // 提交 expand + mask 任务（expand 支持 mask_image_url，AI 填充白色区域）
    const submitRes = await nodeFetch(DASHSCOPE_IMG_SYNTHESIS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DASHSCOPE_API_KEY}`,
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({
        model: 'wanx2.1-imageedit',
        input: {
          function: 'expand',
          prompt,
          base_image_url: canvasDataUrl,
          mask_image_url: maskDataUrl,
        },
        parameters: { n: 1 },
      }),
    });

    const submitData = await submitRes.json();
    if (!submitRes.ok) {
      console.error('[Extend Image] Submit failed:', submitData);
      return res.status(submitRes.status).json({ error: submitData });
    }

    const taskId = submitData.output?.task_id;
    if (!taskId) {
      return res.status(500).json({ error: '未获取到 task_id', detail: submitData });
    }

    console.log('[Extend Image] Task submitted:', taskId);

    // 轮询结果（每 5 秒，最多 120 秒）
    for (let i = 0; i < 24; i++) {
      await new Promise(r => setTimeout(r, 5000));

      const pollRes = await nodeFetch(`${DASHSCOPE_TASK_URL}/${taskId}`, {
        headers: { 'Authorization': `Bearer ${DASHSCOPE_API_KEY}` },
      });
      const pollData = await pollRes.json();
      const status = pollData.output?.task_status;
      console.log('[Extend Image] Poll status:', status);

      if (status === 'SUCCEEDED') {
        const url = pollData.output?.results?.[0]?.url;
        console.log('[Extend Image] SUCCEEDED, url:', url);
        if (!url) {
          return res.status(500).json({ error: 'SUCCEEDED 但未找到 url', detail: pollData.output });
        }
        return res.json({ url, taskId });
      }
      if (status === 'FAILED') {
        console.error('[Extend Image] FAILED:', pollData.output?.code, pollData.output?.message);
        return res.status(500).json({ error: '任务失败', code: pollData.output?.code, message: pollData.output?.message });
      }
    }

    res.status(504).json({ error: '任务超时（超过 120 秒）' });
  } catch (err) {
    console.error('[Extend Image]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Ollama API 代理
app.use(createProxyMiddleware({
  pathFilter: '/ollama',
  target: 'http://10.222.68.103:3005',
  changeOrigin: true,
  proxyTimeout: 600000,
  timeout: 600000,
  on: {
    proxyReq: (proxyReq) => {
      // 移除浏览器携带的 Origin/Referer，避免 Ollama 403 来源校验
      proxyReq.removeHeader('Origin');
      proxyReq.removeHeader('Referer');
    },
  },
}));

// ComfyUI 本地代理 (http://127.0.0.1:8188/)
const COMFYUI_BASE = 'http://10.235.124.12:8188';

app.use('/api/comfyui', async (req, res) => {
  // req.url 已去掉 /api/comfyui 前缀
  const targetUrl = `${COMFYUI_BASE}${req.url}`;
  console.log('[ComfyUI proxy]', req.method, targetUrl);

  try {
    const options = { method: req.method, headers: {} };
    if (req.body && req.method !== 'GET' && req.method !== 'HEAD') {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(req.body);
    }

    const upstream = await nodeFetch(targetUrl, options);
    const ct = upstream.headers.get('content-type') || '';
    res.status(upstream.status);
    if (ct) res.setHeader('Content-Type', ct);

    if (ct.startsWith('image/') || ct.includes('octet-stream')) {
      const buf = await upstream.buffer();
      res.send(buf);
    } else {
      const text = await upstream.text();
      res.send(text);
    }
  } catch (err) {
    console.error('[ComfyUI]', err.message);
    res.status(502).json({ error: 'ComfyUI 不可达', detail: err.message });
  }
});

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')));

// 所有路由返回 index.html (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

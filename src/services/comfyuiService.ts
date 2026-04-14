/**
 * ComfyUI 本地服务调用
 * 优先直连 http://127.0.0.1:8188（ComfyUI 默认开启 CORS）
 * 若直连失败则走 /api/comfyui 代理
 */

const PROXY = '/api/comfyui';

// 只走 server.js 代理，浏览器无法直连 127.0.0.1 不同端口（PNA 限制）
async function comfyFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${PROXY}${path}`, init);
}

// 安全 JSON 解析，把原始文本暴露出来方便排查
async function safeJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`ComfyUI 返回了非 JSON 内容 (status ${res.status}):\n${text.slice(0, 400)}`);
  }
}

// ── 类型 ──────────────────────────────────────────────────
interface PromptResponse {
  prompt_id: string;
  number: number;
  node_errors: Record<string, unknown>;
  error?: string;
}

interface HistoryImage {
  filename: string;
  subfolder: string;
  type: string;
}

interface HistoryOutput {
  images?: HistoryImage[];
}

interface HistoryEntry {
  outputs: Record<string, HistoryOutput>;
  status: { completed: boolean; status_str: string };
}

// ── UUID（不依赖 secure context）────────────────────────────
function randomUUID(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b).map(x => x.toString(16).padStart(2, '0'));
  return `${h.slice(0,4).join('')}-${h.slice(4,6).join('')}-${h.slice(6,8).join('')}-${h.slice(8,10).join('')}-${h.slice(10).join('')}`;
}

// ── 工作流构建 ────────────────────────────────────────────
function buildWidgetWorkflow(
  positivePrompt: string,
  negativePrompt: string,
  checkpointName: string,
  seed: number,
  loraName?: string,
) {
  const modelRef = loraName ? ['10', 0] : ['4', 0];
  const clipRef  = loraName ? ['10', 1] : ['4', 1];

  const workflow: Record<string, unknown> = {
    '4': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: checkpointName },
    },
    '5': {
      class_type: 'EmptyLatentImage',
      inputs: { width: 248, height: 264, batch_size: 1 },
    },
    '6': {
      class_type: 'CLIPTextEncode',
      inputs: { text: positivePrompt, clip: clipRef },
    },
    '7': {
      class_type: 'CLIPTextEncode',
      inputs: { text: negativePrompt, clip: clipRef },
    },
    '3': {
      class_type: 'KSampler',
      inputs: {
        seed,
        steps: 20,
        cfg: 7.5,
        sampler_name: 'euler_ancestral',
        scheduler: 'normal',
        denoise: 1.0,
        model: modelRef,
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
    },
    '8': {
      class_type: 'VAEDecode',
      inputs: { samples: ['3', 0], vae: ['4', 2] },
    },
    '9': {
      class_type: 'SaveImage',
      inputs: { filename_prefix: 'weibo_widget', images: ['8', 0] },
    },
  };

  if (loraName) {
    workflow['10'] = {
      class_type: 'LoraLoader',
      inputs: {
        model: ['4', 0],
        clip: ['4', 1],
        lora_name: loraName,
        strength_model: 1.0,
        strength_clip: 1.0,
      },
    };
  }

  return workflow;
}

// ── 获取可用模型列表 ───────────────────────────────────────
export async function getAvailableCheckpoints(): Promise<string[]> {
  const res = await comfyFetch('/object_info/CheckpointLoaderSimple');
  if (!res.ok) throw new Error(`ComfyUI /object_info 失败 (${res.status})`);
  const data = await safeJson<{
    CheckpointLoaderSimple: { input: { required: { ckpt_name: [string[]] } } };
  }>(res);
  return data.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
}

// ── 获取可用 LoRA 列表 ────────────────────────────────────
export async function getAvailableLoras(): Promise<string[]> {
  const res = await comfyFetch('/object_info/LoraLoader');
  if (!res.ok) return [];
  const data = await safeJson<{
    LoraLoader: { input: { required: { lora_name: [string[]] } } };
  }>(res);
  return data.LoraLoader?.input?.required?.lora_name?.[0] ?? [];
}

// ── 轮询历史直到完成 ──────────────────────────────────────
async function pollHistory(promptId: string, timeoutMs = 600_000): Promise<HistoryImage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 1500));
    const res = await comfyFetch(`/history/${promptId}`);
    if (!res.ok) continue;
    const history = await safeJson<Record<string, HistoryEntry>>(res);
    const entry = history[promptId];
    if (!entry) continue;
    if (entry.status?.completed) {
      for (const output of Object.values(entry.outputs)) {
        if (output.images && output.images.length > 0) return output.images[0];
      }
    }
  }
  throw new Error('ComfyUI 生成超时，请检查队列状态');
}

// ── 图片转 data URL ────────────────────────────────────────
async function fetchImageAsDataURL(img: HistoryImage): Promise<string> {
  const path = `/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${img.type}`;
  const res = await comfyFetch(path);
  if (!res.ok) throw new Error(`图片获取失败 (${res.status})`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ── 主入口 ────────────────────────────────────────────────
export async function generateWidgetWithComfyUI(
  positivePrompt: string,
  negativePrompt = 'blurry, low quality, nsfw, watermark, text, logo, signature',
  checkpointOverride?: string,
  loraName?: string,
): Promise<string> {
  // 1. 确定模型
  let checkpoint = checkpointOverride ?? '';
  console.log('[ComfyUI] step1 start, checkpoint override =', checkpoint || '(none)');
  if (!checkpoint) {
    const list = await getAvailableCheckpoints();
    if (list.length === 0) throw new Error('ComfyUI 中未找到任何模型，请先下载一个 checkpoint');
    checkpoint = list[0];
  }
  console.log('[ComfyUI] step1 done, using checkpoint =', checkpoint);

  // 2. 提交工作流
  const seed = Math.floor(Math.random() * 2 ** 32);
  const workflow = buildWidgetWorkflow(positivePrompt, negativePrompt, checkpoint, seed, loraName);
  const clientId = randomUUID();
  console.log('[ComfyUI] step2 submitting prompt, clientId =', clientId);

  const submitRes = await comfyFetch('/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });
  console.log('[ComfyUI] step2 response status =', submitRes.status);

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`ComfyUI 提交失败 (${submitRes.status}): ${errText.slice(0, 300)}`);
  }

  const respJson = await safeJson<PromptResponse>(submitRes);
  console.log('[ComfyUI] step2 response =', respJson);
  if (respJson.error) throw new Error(`ComfyUI 错误: ${respJson.error}`);
  if (respJson.node_errors && Object.keys(respJson.node_errors).length > 0) {
    console.warn('[ComfyUI] node_errors:', respJson.node_errors);
    throw new Error(`工作流节点错误: ${JSON.stringify(respJson.node_errors)}`);
  }

  // 3. 等待生成完成
  console.log('[ComfyUI] step3 polling, prompt_id =', respJson.prompt_id);
  const imageInfo = await pollHistory(respJson.prompt_id);
  console.log('[ComfyUI] step3 done, image =', imageInfo);

  // 4. 获取图片
  console.log('[ComfyUI] step4 fetching image');
  return fetchImageAsDataURL(imageInfo);
}

// ── 直接提交原始工作流 JSON ───────────────────────────────
export async function submitRawWorkflow(workflow: Record<string, unknown>): Promise<string> {
  const clientId = randomUUID();
  const submitRes = await comfyFetch('/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
  });
  if (!submitRes.ok) {
    const errText = await submitRes.text();
    throw new Error(`ComfyUI 提交失败 (${submitRes.status}): ${errText.slice(0, 300)}`);
  }
  const respJson = await safeJson<PromptResponse>(submitRes);
  if (respJson.error) throw new Error(`ComfyUI 错误: ${respJson.error}`);
  if (respJson.node_errors && Object.keys(respJson.node_errors).length > 0) {
    throw new Error(`工作流节点错误: ${JSON.stringify(respJson.node_errors)}`);
  }
  const imageInfo = await pollHistory(respJson.prompt_id);
  return fetchImageAsDataURL(imageInfo);
}
// ── 头像挂件固定工作流（API格式，从 头像挂件修改(1).json 转换）─────
// node 23 的 string 为用户提示词，node 20 为固定前缀
const AVATAR_WIDGET_WORKFLOW_TEMPLATE: Record<string, unknown> = {
  '1':  { class_type: 'BasicScheduler',         inputs: { model: ['15', 0], scheduler: 'normal', steps: 20, denoise: 1 } },
  '2':  { class_type: 'RandomNoise',             inputs: { noise_seed: 0 } },
  '3':  { class_type: 'KSamplerSelect',          inputs: { sampler_name: 'dpmpp_2m' } },
  '4':  { class_type: 'BasicGuider',             inputs: { model: ['15', 0], conditioning: ['13', 0] } },
  '5':  { class_type: 'SamplerCustomAdvanced',   inputs: { noise: ['2', 0], guider: ['4', 0], sampler: ['3', 0], sigmas: ['1', 0], latent_image: ['10', 0] } },
  '6':  { class_type: 'VAEDecode',               inputs: { samples: ['5', 0], vae: ['7', 0] } },
  '7':  { class_type: 'VAELoader',               inputs: { vae_name: 'FLUX-VAE_FLUX-VAE.safetensors' } },
  '9':  { class_type: 'DualCLIPLoader',          inputs: { clip_name1: 't5xxl_fp8_e4m3fn.safetensors', clip_name2: 'clip_l.safetensors', type: 'flux', device: 'default' } },
  '10': { class_type: 'EmptyLatentImage',        inputs: { width: 256, height: 272, batch_size: 1 } },
  '13': { class_type: 'CLIPTextEncode',          inputs: { clip: ['15', 1], text: ['17', 0] } },
  '15': { class_type: 'LoraLoader',              inputs: { model: ['16', 0], clip: ['9', 0], lora_name: '头像挂件\\flux-lora-挂件整合2.safetensors', strength_model: 0.8, strength_clip: 1 } },
  '16': { class_type: 'UNETLoader',              inputs: { unet_name: 'F.1\\F.1基础算法模型F.1-dev-fp8.safetensors', weight_dtype: 'fp8_e4m3fn' } },
  '17': { class_type: 'JoinStrings',             inputs: { string1: ['20', 0], string2: ['23', 0], delimiter: ' ' } },
  '20': { class_type: 'Primitive string multiline [Crystools]', inputs: { string: '(Hollow middle, white background, cute cartoon frame, white background picture.  no_humans, simple_background, ' } },
  '21': { class_type: 'PreviewImage',            inputs: { images: ['6', 0] } },
  '23': { class_type: 'Primitive string multiline [Crystools]', inputs: { string: '' } },
};

export async function submitAvatarWidgetWorkflow(userPrompt: string): Promise<string> {
  const workflow = JSON.parse(JSON.stringify(AVATAR_WIDGET_WORKFLOW_TEMPLATE));
  (workflow['2'] as { class_type: string; inputs: { noise_seed: number } }).inputs.noise_seed = Math.floor(Math.random() * 2 ** 32);
  (workflow['23'] as { class_type: string; inputs: { string: string } }).inputs.string = userPrompt || 'cute decoration, colorful elements';
  return submitRawWorkflow(workflow);
}

export async function checkComfyUIHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${PROXY}/system_stats`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

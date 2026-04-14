/**
 * Ollama CORS 代理服务
 * 解决浏览器访问 Ollama 的跨域问题
 */

import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const app = express();

// CORS 中间件
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const PORT = 3005;

// Ollama 后端地址
const OLLAMA_TARGET = 'http://10.222.68.103:11434';

// 代理所有 /ollama/* 请求到 Ollama
app.use('/ollama', createProxyMiddleware({
  target: OLLAMA_TARGET,
  changeOrigin: true,
  proxyTimeout: 600000,  // 10 分钟，适应大模型推理耗时
  timeout: 600000,
  pathRewrite: {
    '^/ollama': '', // 移除 /ollama 前缀
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`[Proxy] ${req.method} ${req.url} -> ${OLLAMA_TARGET}${req.url}`);
    // 移除 Origin/Referer 头，服务器间请求无需这些头
    // Ollama 对非浏览器请求（无 Origin）不做来源校验
    proxyReq.removeHeader('Origin');
    proxyReq.removeHeader('Referer');
  },
  onProxyRes: (proxyRes, req, res) => {
    // 添加 CORS 头
    proxyRes.headers['access-control-allow-origin'] = '*';
    proxyRes.headers['access-control-allow-methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    proxyRes.headers['access-control-allow-headers'] = 'Content-Type, Authorization';
  },
  onError: (err, req, res) => {
    console.error('[Proxy Error]', err.message);
    res.status(502).json({ error: 'Proxy error', message: err.message });
  }
}));

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', target: OLLAMA_TARGET });
});

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('Ollama CORS 代理服务已启动');
  console.log('='.repeat(50));
  console.log(`本地地址: http://localhost:${PORT}`);
  console.log(`网络地址: http://10.222.68.103:${PORT}`);
  console.log(`Ollama 目标: ${OLLAMA_TARGET}`);
  console.log('');
  console.log('使用方式:');
  console.log(`  原始: ${OLLAMA_TARGET}/api/generate`);
  console.log(`  代理: http://10.222.68.103:${PORT}/ollama/api/generate`);
  console.log('='.repeat(50));
});
import React, { useState, useEffect } from 'react';
import { Sparkles, Download, MoveHorizontal, Image as ImageIcon, RefreshCw, Maximize2, Layers, Frame, CheckCircle2, Circle, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { generateWidgetWithComfyUI, submitRawWorkflow, submitAvatarWidgetWorkflow, getAvailableCheckpoints, getAvailableLoras, checkComfyUIHealth } from '../services/comfyuiService';
import { HistoryItem } from '../types';

type PageMode = 'general' | 'widget';

interface GeneratePageProps {
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
}

// Avatar widget zone overlay component
const AvatarWidgetOverlay: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none" style={{ aspectRatio: '250/268' }}>
    {/* V-mark avoid zone: bottom-right 60×60px */}
    <div
      className="absolute border-2 border-dashed border-red-400/70 bg-red-400/10 flex items-center justify-center"
      style={{ right: '4%', bottom: '4%', width: '22%', height: '22%' }}
    >
      <span className="text-red-500 text-[8px] font-bold leading-none text-center">V标<br/>避让</span>
    </div>
    {/* Avatar center zone: 228×228px centered */}
    <div
      className="absolute rounded-full border-2 border-dashed border-blue-400/70 bg-blue-400/5 flex items-center justify-center"
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: '91.2%', height: '85%' }}
    >
      <span className="text-blue-500 text-[9px] font-bold text-center leading-snug">用户头像<br/>228×228</span>
    </div>
    {/* Left avoid zone */}
    <div
      className="absolute border-r-2 border-dashed border-yellow-400/60 bg-yellow-400/5"
      style={{ left: 0, top: 0, bottom: 0, width: '1.6%' }}
    />
    {/* Right avoid zone */}
    <div
      className="absolute border-l-2 border-dashed border-yellow-400/60 bg-yellow-400/5"
      style={{ right: 0, top: 0, bottom: 0, width: '1.6%' }}
    />
    {/* Main element zone: top 60px */}
    <div
      className="absolute border-b-2 border-dashed border-green-400/60 bg-green-400/5"
      style={{ left: 0, right: 0, top: 0, height: '22.4%' }}
    >
      <span className="absolute top-1 left-1/2 -translate-x-1/2 text-green-600 text-[7px] font-bold whitespace-nowrap">主元素区域 60px</span>
    </div>
  </div>
);

export const GeneratePage: React.FC<GeneratePageProps> = ({ onAddHistory }) => {
  const [mode, setMode] = useState<PageMode>('general');

  // General mode state
  const [prompt, setPrompt] = useState('');
  const [selectedSize, setSelectedSize] = useState('1080x1080');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [selectedTone, setSelectedTone] = useState('neutral');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  // Widget mode state
  const [widgetPrompt, setWidgetPrompt] = useState('');
  const [isGeneratingWidget, setIsGeneratingWidget] = useState(false);
  const [generatedWidget, setGeneratedWidget] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [genStep, setGenStep] = useState(0); // 0=idle, 1-4=steps

  // ComfyUI connection state
  const [comfyOnline, setComfyOnline] = useState<boolean | null>(null);
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState('');
  const [loras, setLoras] = useState<string[]>([]);
  const [selectedLora, setSelectedLora] = useState('');
  const [showCheckpointMenu, setShowCheckpointMenu] = useState(false);
  const [showLoraMenu, setShowLoraMenu] = useState(false);
  const [comfyError, setComfyError] = useState('');
  const [useCustomWorkflow, setUseCustomWorkflow] = useState(false);
  const [customWorkflowJson, setCustomWorkflowJson] = useState('');

  const [isOptimizingWidget, setIsOptimizingWidget] = useState(false);

  const widgetPromptSuggestions = [
    '小熊猫元素，竹子装饰，可爱风格',
    '星空流光，宇宙粒子，梦幻紫色',
    '国风祥云，金色纹样，东方美学',
    '节日彩带，圣诞雪花，喜庆氛围',
    '森系花环，水彩花卉，清新自然',
  ];

  const handleOptimizeWidgetPrompt = async () => {
    setIsOptimizingWidget(true);
    await new Promise(r => setTimeout(r, 800));
    if (!widgetPrompt.trim()) {
      const suggestion = widgetPromptSuggestions[Math.floor(Math.random() * widgetPromptSuggestions.length)];
      setWidgetPrompt(suggestion);
    } else {
      setWidgetPrompt(prev => prev.replace(/[，,]\s*$/, '') + '，精致细节，高品质装饰，透明背景');
    }
    setIsOptimizingWidget(false);
  };

  const GEN_STEPS = [
    { label: '生成装饰元素', desc: 'AI 正在绘制装饰图形与特效...' },
    { label: '应用挂件规范', desc: '自动规避头像区域与避让区...' },
    { label: '优化输出质量', desc: '精修细节，准备导出 PNG...' },
  ];

  useEffect(() => {
    if (!isGeneratingWidget) { setGenStep(0); return; }
    setGenStep(1);
    const timers = [
      setTimeout(() => setGenStep(2), 1800),
      setTimeout(() => setGenStep(3), 3800),
      setTimeout(() => setGenStep(4), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isGeneratingWidget]);

  // ComfyUI 健康检查 & 模型列表（切换到 widget 模式时触发）
  useEffect(() => {
    if (mode !== 'widget') return;
    let cancelled = false;
    (async () => {
      setComfyOnline(null);
      setComfyError('');
      const online = await checkComfyUIHealth();
      if (cancelled) return;
      setComfyOnline(online);
      if (online) {
        try {
          const [list, loraList] = await Promise.all([
            getAvailableCheckpoints(),
            getAvailableLoras(),
          ]);
          if (cancelled) return;
          setCheckpoints(list);
          if (list.length > 0) setSelectedCheckpoint(list[0]);
          setLoras(loraList);
        } catch {
          // model list is optional
        }
      }
    })();
    return () => { cancelled = true; };
  }, [mode]);

  const handleDownload = (url: string, filename?: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `weibo-vip-asset-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOptimizePrompt = async () => {
    if (!prompt.trim()) return;
    setIsOptimizing(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setPrompt(prev => prev + '，精致的细节，8k分辨率，大师级构图，柔和的光影效果');
    setIsOptimizing(false);
  };

  const sizes = [
    { id: '1080x1080', name: '方形', detail: '1080×1080', icon: 'aspect-square' },
    { id: '1920x1080', name: '横屏', detail: '1920×1080', icon: 'aspect-video' },
    { id: '1080x1920', name: '竖屏', detail: '1080×1920', icon: 'aspect-[9/16]' },
    { id: '750x1334', name: '手机', detail: '750×1334', icon: 'aspect-[750/1334]' },
    { id: '375x667', name: '小屏', detail: '375×667', icon: 'aspect-[375/667]' },
  ];

  const styles = [
    { id: 'realistic', name: '写实风格' },
    { id: 'cartoon', name: '卡通插画' },
    { id: 'minimalist', name: '极简主义' },
    { id: '3d', name: '3D 渲染' },
    { id: 'watercolor', name: '水彩风格' },
    { id: 'neon', name: '霓虹赛博' },
  ];

  const tones = [
    { id: 'warm', name: '温暖' },
    { id: 'cool', name: '冷色' },
    { id: 'neutral', name: '中性' },
    { id: 'golden', name: '金橙' },
    { id: 'vibrant', name: '鲜艳' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const fullPrompt = `Weibo VIP asset: ${prompt}. Style: ${selectedStyle}. Lighting: ${selectedTone}. High quality, professional design.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp-image-generation',
        contents: [{ parts: [{ text: fullPrompt }] }],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: {
            aspectRatio: selectedSize === '1080x1080' ? '1:1' :
                         selectedSize === '1920x1080' ? '16:9' : '9:16'
          }
        }
      });

      const newImages: string[] = [];
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          newImages.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
        }
      }

      if (newImages.length > 0) {
        setGeneratedImages(prev => [...newImages, ...prev]);
        onAddHistory({
          title: prompt.slice(0, 20) || '通用资产',
          style: styles.find(s => s.id === selectedStyle)?.name || selectedStyle,
          size: sizes.find(s => s.id === selectedSize)?.detail || selectedSize,
          imageUrl: newImages[0],
          type: 'generate',
        });
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateWidget = async () => {
    if (comfyOnline === false) { setComfyError('ComfyUI 未连接，请确认本地服务已启动'); return; }
    setIsGeneratingWidget(true);
    setComfyError('');

    try {
      let dataUrl: string;

      if (useCustomWorkflow) {
        dataUrl = await submitAvatarWidgetWorkflow(widgetPrompt.trim());
      } else {
        const userDesc = widgetPrompt.trim() ? widgetPrompt + ', ' : '';
        const positivePrompt = [
          `${userDesc}Weibo VIP avatar frame decoration widget,`,
          'decorative frame border ornament, transparent background, empty circular center for avatar,',
          'design elements on frame edges and top area, bottom-right corner empty (VIP badge area),',
          'high quality, professional VIP member decoration, masterpiece, detailed',
        ].join(' ');
        dataUrl = await generateWidgetWithComfyUI(
          positivePrompt,
          undefined,
          selectedCheckpoint || undefined,
          selectedLora || undefined,
        );
      }

      setGeneratedWidget(dataUrl);
      onAddHistory({
        title: widgetPrompt.slice(0, 20) || '头像挂件',
        style: useCustomWorkflow ? '固定工作流' : '自动生成',
        size: '250×268',
        imageUrl: dataUrl,
        type: 'widget',
      });
    } catch (error) {
      console.error('Widget generation failed:', error);
      setComfyError(error instanceof Error ? error.message : '生成失败，请重试');
    } finally {
      setIsGeneratingWidget(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="mb-12 relative">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 text-weibo-orange font-bold text-xs uppercase tracking-[0.3em] mb-4"
        >
          <div className="w-8 h-[2px] bg-weibo-orange" />
          AI Creative Engine
        </motion.div>
        <h1 className="font-serif text-6xl font-bold text-[#1A1A1A] mb-6 tracking-normal leading-tight">
          资产生成 <span className="text-gradient-weibo italic inline-block pr-4">Studio</span>
        </h1>
        <p className="text-[#5A5A5A] text-xl max-w-2xl font-light leading-relaxed">
          利用 wegent 强大的视觉理解与生成能力，为您的微博会员装扮注入无限创意。
        </p>
      </header>

      {/* Mode Tabs */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 mb-10 p-1.5 bg-[#FFFAF2] border-2 border-[#FFE8CC] rounded-2xl w-fit"
      >
        <button
          onClick={() => setMode('general')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            mode === 'general'
              ? 'bg-white text-[#1A1A1A] shadow-md border border-[#FFE8CC]'
              : 'text-[#999999] hover:text-[#5A5A5A]'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          通用资产生成
        </button>
        <button
          onClick={() => setMode('widget')}
          className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
            mode === 'widget'
              ? 'bg-gradient-to-r from-weibo-orange to-weibo-orange-dark text-white shadow-md shadow-weibo-orange/20'
              : 'text-[#999999] hover:text-[#5A5A5A]'
          }`}
        >
          <Frame className="w-4 h-4" />
          头像挂件生成
          <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-md">250×268</span>
        </button>
      </motion.div>

      <AnimatePresence mode="wait">
        {mode === 'general' ? (
          <motion.div
            key="general"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start"
          >
            {/* Controls Sidebar */}
            <div className="lg:col-span-4 space-y-8">
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card rounded-[2.5rem] p-8"
              >
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-3">
                  <div className="w-1 h-5 bg-weibo-orange rounded-full" />
                  创意描述
                </h2>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Red hat, cute elements, heart, stars, little rabbit, big ear elements, white background"
                  className="w-full h-40 p-5 bg-[#FFFAF2] border-2 border-[#FFE8CC] rounded-2xl text-sm font-medium focus:border-weibo-orange focus:ring-4 focus:ring-weibo-orange/10 transition-all resize-none placeholder:text-[#999999]"
                />
                <div className="mt-4 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-[#999999] uppercase tracking-widest">Prompt Engineering</span>
                  <button
                    onClick={handleOptimizePrompt}
                    disabled={isOptimizing || !prompt.trim()}
                    className="text-[10px] font-bold text-weibo-orange hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {isOptimizing ? (
                      <div className="w-3 h-3 border border-weibo-orange/30 border-t-weibo-orange rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {isOptimizing ? '正在优化...' : '智能优化描述词'}
                  </button>
                </div>
              </motion.section>

              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card rounded-[2.5rem] p-8"
              >
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-3">
                  <div className="w-1 h-5 bg-weibo-orange rounded-full" />
                  生成参数
                </h2>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-[#999999] uppercase tracking-widest mb-3 block">画布比例</label>
                    <div className="grid grid-cols-3 gap-2">
                      {sizes.map((size) => (
                        <button
                          key={size.id}
                          onClick={() => setSelectedSize(size.id)}
                          className={`py-3 rounded-xl text-xs font-bold border-2 transition-all ${
                            selectedSize === size.id
                              ? 'border-weibo-orange bg-weibo-orange text-white shadow-lg shadow-weibo-orange/20'
                              : 'border-[#FFE8CC] bg-white text-[#5A5A5A] hover:border-weibo-orange/30'
                          }`}
                        >
                          {size.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#999999] uppercase tracking-widest mb-3 block">视觉风格</label>
                    <div className="flex flex-wrap gap-2">
                      {styles.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStyle(s.id)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                            selectedStyle === s.id
                              ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                              : 'bg-white text-[#999999] border-[#FFE8CC] hover:border-[#1A1A1A]'
                          }`}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-[#999999] uppercase tracking-widest mb-3 block">色调偏好</label>
                    <div className="flex flex-wrap gap-2">
                      {tones.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTone(t.id)}
                          className={`px-4 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                            selectedTone === t.id
                              ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                              : 'bg-white text-[#999999] border-[#FFE8CC] hover:border-[#1A1A1A]'
                          }`}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.section>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-6 bg-gradient-to-r from-weibo-orange to-weibo-orange-dark text-white rounded-[2rem] font-bold text-lg shadow-2xl shadow-weibo-orange/30 hover:shadow-weibo-orange/50 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3 btn-tactile"
              >
                {isGenerating ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-6 h-6 fill-current" />
                )}
                {isGenerating ? '正在构思艺术品...' : '立即生成视觉资产'}
              </button>
            </div>

            {/* Preview Area */}
            <div className="lg:col-span-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card rounded-[3rem] p-4 min-h-[600px] flex flex-col relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />

                <div className="flex-1 flex items-center justify-center p-8">
                  <AnimatePresence mode="wait">
                    {isGenerating ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center"
                      >
                        <div className="relative w-32 h-32 mx-auto mb-10">
                          <div className="absolute inset-0 border-4 border-weibo-orange/10 rounded-full" />
                          <div className="absolute inset-0 border-4 border-weibo-orange border-t-transparent rounded-full animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="w-10 h-10 text-weibo-orange animate-pulse" />
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-[#1A1A1A] mb-4">正在渲染您的创意</h3>
                        <p className="text-[#999999] text-sm font-medium max-w-xs mx-auto leading-relaxed">
                          Gemini 正在根据您的描述词进行多层神经网络渲染，请稍候片刻...
                        </p>
                      </motion.div>
                    ) : generatedImages.length > 0 ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="w-full h-full flex flex-col items-center"
                      >
                        <div className="relative group rounded-[2.5rem] overflow-hidden shadow-2xl border-8 border-white bg-white max-w-full">
                          <img
                            src={generatedImages[0]}
                            alt="Generated"
                            className="max-h-[500px] w-auto object-contain"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-4 backdrop-blur-sm">
                            <button
                              onClick={() => handleDownload(generatedImages[0])}
                              className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-weibo-orange hover:scale-110 transition-transform shadow-xl"
                            >
                              <Download className="w-6 h-6" />
                            </button>
                            <button className="w-14 h-14 bg-weibo-orange rounded-2xl flex items-center justify-center text-white hover:scale-110 transition-transform shadow-xl">
                              <MoveHorizontal className="w-6 h-6" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-10 flex gap-4">
                          <button
                            onClick={handleGenerate}
                            className="px-8 py-3 bg-white border-2 border-[#FFE8CC] text-[#5A5A5A] rounded-2xl font-bold text-sm hover:bg-[#FFFAF2] transition-all flex items-center gap-2 btn-tactile"
                          >
                            <RefreshCw className="w-4 h-4" />
                            重新生成
                          </button>
                          <button className="px-8 py-3 bg-[#1A1A1A] text-white rounded-2xl font-bold text-sm hover:bg-black transition-all flex items-center gap-2 btn-tactile shadow-xl">
                            <Maximize2 className="w-4 h-4" />
                            高清放大 (4K)
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                      >
                        <div className="w-24 h-24 bg-[#FFFAF2] rounded-[2rem] border-2 border-dashed border-[#FFD699] flex items-center justify-center mx-auto mb-8">
                          <ImageIcon className="w-10 h-10 text-[#FFD699]" />
                        </div>
                        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">等待灵感迸发</h3>
                        <p className="text-[#999999] text-sm font-medium max-w-xs mx-auto">
                          在左侧输入您的创意描述，点击生成按钮，开启 AI 视觉创作之旅。
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-8 border-t border-[#FFE8CC]/50 bg-white/50 backdrop-blur-md flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-[#999999] uppercase tracking-widest">WeAgent Engine Online</span>
                    </div>
                    <div className="h-4 w-[1px] bg-[#FFE8CC]" />
                    <div className="text-[10px] font-bold text-[#5A5A5A] uppercase tracking-widest">Model: WeAgent Pro</div>
                  </div>
                  <div className="text-[10px] font-bold text-[#999999] uppercase tracking-widest">
                    Resolution: {selectedSize} px
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="widget"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start"
          >
            {/* Widget Controls */}
            <div className="lg:col-span-4 space-y-8">
              {/* ComfyUI Connection Status */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-2xl border-2 p-4 flex items-center gap-3 ${
                  comfyOnline === null
                    ? 'border-[#FFE8CC] bg-[#FFFAF2]'
                    : comfyOnline
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                {comfyOnline === null ? (
                  <div className="w-4 h-4 border-2 border-[#CCCCCC] border-t-weibo-orange rounded-full animate-spin shrink-0" />
                ) : comfyOnline ? (
                  <Wifi className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold ${comfyOnline === null ? 'text-[#999999]' : comfyOnline ? 'text-green-700' : 'text-red-500'}`}>
                    {comfyOnline === null ? '正在连接 ComfyUI...' : comfyOnline ? 'ComfyUI 已连接' : 'ComfyUI 未连接'}
                  </div>
                  <div className="text-[10px] text-[#999999] truncate">127.0.0.1:8188</div>
                </div>
              </motion.div>

              {/* Model + LoRA selectors */}
              {comfyOnline && (
                <motion.section
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card rounded-[2.5rem] p-6 space-y-4"
                >
                  <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                    <div className="w-1 h-4 bg-weibo-orange rounded-full" />
                    模型与风格包
                  </h2>

                  {/* Checkpoint dropdown */}
                  {checkpoints.length > 0 && (
                    <div>
                      <button
                        onClick={() => { setShowCheckpointMenu(v => !v); setShowLoraMenu(false); }}
                        className="w-full px-4 py-3 bg-[#FFFAF2] border-2 border-[#FFE8CC] rounded-2xl text-left flex items-center gap-3 hover:border-weibo-orange/50 transition-colors focus:outline-none"
                      >
                        <div className="w-7 h-7 rounded-xl bg-weibo-orange/10 flex items-center justify-center shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-weibo-orange" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[9px] font-bold text-[#999999] uppercase tracking-wider">Checkpoint 模型</div>
                          <div className="text-xs font-bold text-[#1A1A1A] truncate mt-0.5">
                            {selectedCheckpoint ? selectedCheckpoint.replace(/\.[^.]+$/, '') : '自动选择'}
                          </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-[#BBBBBB] shrink-0 transition-transform duration-200 ${showCheckpointMenu ? 'rotate-180' : ''}`} />
                      </button>
                      {showCheckpointMenu && (
                        <div className="mt-1.5 bg-white border-2 border-[#FFE8CC] rounded-2xl overflow-hidden max-h-44 overflow-y-auto">
                          {checkpoints.map(c => (
                            <button
                              key={c}
                              onClick={() => { setSelectedCheckpoint(c); setShowCheckpointMenu(false); }}
                              className={`w-full px-4 py-2.5 text-left flex items-center gap-2 transition-colors hover:bg-[#FFFAF2] ${selectedCheckpoint === c ? 'bg-[#FFF8EE]' : ''}`}
                            >
                              {selectedCheckpoint === c && <div className="w-1.5 h-1.5 rounded-full bg-weibo-orange shrink-0" />}
                              <span className={`text-xs truncate ${selectedCheckpoint === c ? 'font-bold text-weibo-orange' : 'font-medium text-[#5A5A5A]'}`}>
                                {c.replace(/\.[^.]+$/, '')}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* LoRA dropdown */}
                  <div>
                    <button
                      onClick={() => { setShowLoraMenu(v => !v); setShowCheckpointMenu(false); }}
                      className="w-full px-4 py-3 bg-[#FFFAF2] border-2 border-[#FFE8CC] rounded-2xl text-left flex items-center gap-3 hover:border-weibo-orange/50 transition-colors focus:outline-none"
                    >
                      <div className="w-7 h-7 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                        <Layers className="w-3.5 h-3.5 text-purple-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-bold text-[#999999] uppercase tracking-wider">LoRA 风格包</div>
                        <div className="text-xs font-bold text-[#1A1A1A] truncate mt-0.5">
                          {selectedLora ? selectedLora.replace(/\.[^.]+$/, '') : '不使用 LoRA'}
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-[#BBBBBB] shrink-0 transition-transform duration-200 ${showLoraMenu ? 'rotate-180' : ''}`} />
                    </button>
                    {showLoraMenu && (
                      <div className="mt-1.5 bg-white border-2 border-[#FFE8CC] rounded-2xl overflow-hidden max-h-44 overflow-y-auto">
                        <button
                          onClick={() => { setSelectedLora(''); setShowLoraMenu(false); }}
                          className={`w-full px-4 py-2.5 text-left flex items-center gap-2 transition-colors hover:bg-[#FFFAF2] ${!selectedLora ? 'bg-[#FFF8EE]' : ''}`}
                        >
                          {!selectedLora && <div className="w-1.5 h-1.5 rounded-full bg-weibo-orange shrink-0" />}
                          <span className={`text-xs ${!selectedLora ? 'font-bold text-weibo-orange' : 'font-medium text-[#5A5A5A]'}`}>不使用 LoRA</span>
                        </button>
                        {loras.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-[#BBBBBB]">未找到 LoRA 文件</div>
                        ) : loras.map(l => (
                          <button
                            key={l}
                            onClick={() => { setSelectedLora(l); setShowLoraMenu(false); }}
                            className={`w-full px-4 py-2.5 text-left flex items-center gap-2 transition-colors hover:bg-[#FFFAF2] ${selectedLora === l ? 'bg-[#FFF8EE]' : ''}`}
                          >
                            {selectedLora === l && <div className="w-1.5 h-1.5 rounded-full bg-weibo-orange shrink-0" />}
                            <span className={`text-xs truncate ${selectedLora === l ? 'font-bold text-weibo-orange' : 'font-medium text-[#5A5A5A]'}`}>
                              {l.replace(/\.[^.]+$/, '')}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.section>
              )}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card rounded-[2.5rem] p-8"
              >
                <h2 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-3">
                  <div className="w-1 h-5 bg-weibo-orange rounded-full" />
                  提示词
                </h2>
                <textarea
                  value={widgetPrompt}
                  onChange={(e) => setWidgetPrompt(e.target.value)}
                  placeholder="Red hat, cute elements, heart, stars, little rabbit, big ear elements, white background"
                  className="w-full h-28 p-4 bg-[#FFFAF2] border-2 border-[#FFE8CC] rounded-xl text-sm font-medium focus:border-weibo-orange focus:ring-4 focus:ring-weibo-orange/10 transition-all resize-none placeholder:text-[#999999]"
                />
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={handleOptimizeWidgetPrompt}
                    disabled={isOptimizingWidget}
                    className="text-[10px] font-bold text-weibo-orange hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    {isOptimizingWidget ? (
                      <div className="w-3 h-3 border border-weibo-orange/30 border-t-weibo-orange rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {isOptimizingWidget ? '优化中...' : '智能优化提示词'}
                  </button>
                </div>
              </motion.section>

              {/* Fixed Workflow Toggle */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card rounded-[2.5rem] p-6 space-y-3"
              >
                <button
                  onClick={() => setUseCustomWorkflow(v => !v)}
                  className="w-full flex items-center justify-between"
                >
                  <h2 className="text-sm font-bold text-[#1A1A1A] flex items-center gap-2">
                    <div className="w-1 h-4 bg-weibo-orange rounded-full" />
                    使用固定工作流
                  </h2>
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${useCustomWorkflow ? 'bg-weibo-orange' : 'bg-[#E0E0E0]'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useCustomWorkflow ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
                {useCustomWorkflow && (
                  <div className="rounded-xl bg-[#FFFAF2] border border-[#FFE8CC] px-4 py-3 space-y-1">
                    <div className="text-[10px] font-bold text-weibo-orange uppercase tracking-wider">头像挂件修改 (1).json</div>
                    <div className="text-[10px] text-[#999999] leading-relaxed">
                      FLUX · LoRA: flux-lora-挂件整合2 · 768×768<br/>
                      提示词将注入工作流的自定义描述节点
                    </div>
                  </div>
                )}
              </motion.section>

              {comfyError && (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-600">
                  {comfyError}
                </div>
              )}

              <button
                onClick={handleGenerateWidget}
                disabled={isGeneratingWidget || comfyOnline === false}
                className="w-full py-6 bg-gradient-to-r from-weibo-orange to-weibo-orange-dark text-white rounded-[2rem] font-bold text-lg shadow-2xl shadow-weibo-orange/30 hover:shadow-weibo-orange/50 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3 btn-tactile"
              >
                {isGeneratingWidget ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Frame className="w-6 h-6" />
                )}
                {isGeneratingWidget ? '正在生成挂件...' : '生成头像挂件'}
              </button>

            </div>

            {/* Widget Preview Area */}
            <div className="lg:col-span-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card rounded-[3rem] p-4 min-h-[600px] flex flex-col relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />

                {/* Overlay toggle */}
                <div className="relative z-10 px-6 pt-4 flex items-center justify-end">
                  <button
                    onClick={() => setShowOverlay(v => !v)}
                    className={`text-[10px] font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
                      showOverlay
                        ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                        : 'bg-white text-[#999999] border-[#FFE8CC] hover:border-[#999999]'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    规范区域标注
                  </button>
                </div>

                <div className="flex-1 flex items-center justify-center p-8">
                  <AnimatePresence mode="wait">
                    {isGeneratingWidget ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="w-full max-w-sm"
                      >
                        {/* Spinning icon */}
                        <div className="relative w-20 h-20 mx-auto mb-8">
                          <div className="absolute inset-0 border-4 border-weibo-orange/10 rounded-full" />
                          <div className="absolute inset-0 border-4 border-weibo-orange border-t-transparent rounded-full animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Frame className="w-8 h-8 text-weibo-orange" />
                          </div>
                        </div>

                        <h3 className="text-xl font-bold text-[#1A1A1A] mb-2 text-center">正在生成头像挂件</h3>
                        <p className="text-[#999999] text-xs font-medium text-center mb-8">
                          按微博 UDC 规范自动规避头像区域与避让区
                        </p>

                        {/* Step flow */}
                        <div className="space-y-3">
                          {GEN_STEPS.map((step, i) => {
                            const stepNum = i + 1;
                            const isDone = genStep > stepNum;
                            const isActive = genStep === stepNum;
                            return (
                              <motion.div
                                key={step.label}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: stepNum <= genStep ? 1 : 0.3, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all ${
                                  isActive
                                    ? 'border-weibo-orange bg-[#FFF8EE]'
                                    : isDone
                                    ? 'border-green-200 bg-green-50'
                                    : 'border-[#FFE8CC] bg-white'
                                }`}
                              >
                                <div className="shrink-0">
                                  {isDone ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  ) : isActive ? (
                                    <div className="w-5 h-5 border-2 border-weibo-orange border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Circle className="w-5 h-5 text-[#D0D0D0]" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-xs font-bold ${isActive ? 'text-weibo-orange' : isDone ? 'text-green-600' : 'text-[#CCCCCC]'}`}>
                                    Step {stepNum} · {step.label}
                                  </div>
                                  {isActive && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="text-[10px] text-[#999999] mt-0.5"
                                    >
                                      {step.desc}
                                    </motion.div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    ) : generatedWidget ? (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-8"
                      >
                        {/* Widget preview with overlay */}
                        <div className="relative shadow-2xl rounded-3xl overflow-hidden border-8 border-white bg-[#F0F0F0]"
                          style={{ width: 250, height: 268 }}
                        >
                          <img
                            src={generatedWidget}
                            alt="Generated Widget"
                            className="w-full h-full object-cover"
                          />
                          {showOverlay && <AvatarWidgetOverlay />}
                        </div>

                        {/* Legend */}
                        {showOverlay && (
                          <div className="flex flex-wrap gap-3 justify-center text-[10px] font-bold">
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded-full border-2 border-dashed border-blue-400 inline-block" />
                              <span className="text-[#5A5A5A]">头像区域 (228×228)</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded border-2 border-dashed border-green-400 inline-block" />
                              <span className="text-[#5A5A5A]">主元素区 (top 60px)</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded border-2 border-dashed border-red-400 inline-block" />
                              <span className="text-[#5A5A5A]">V标避让区</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-3 rounded border-2 border-dashed border-yellow-400 inline-block" />
                              <span className="text-[#5A5A5A]">左右避让 (4px)</span>
                            </span>
                          </div>
                        )}

                        <div className="flex gap-4">
                          <button
                            onClick={handleGenerateWidget}
                            className="px-8 py-3 bg-white border-2 border-[#FFE8CC] text-[#5A5A5A] rounded-2xl font-bold text-sm hover:bg-[#FFFAF2] transition-all flex items-center gap-2 btn-tactile"
                          >
                            <RefreshCw className="w-4 h-4" />
                            重新生成
                          </button>
                          <button
                            onClick={() => handleDownload(generatedWidget, `widget-250x268-${Date.now()}.png`)}
                            className="px-8 py-3 bg-gradient-to-r from-weibo-orange to-weibo-orange-dark text-white rounded-2xl font-bold text-sm hover:opacity-90 transition-all flex items-center gap-2 btn-tactile shadow-xl shadow-weibo-orange/20"
                          >
                            <Download className="w-4 h-4" />
                            下载 PNG
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center w-full max-w-sm"
                      >
                        {/* Widget template preview */}
                        <div
                          className="relative mx-auto mb-8 shadow-xl rounded-3xl overflow-hidden border-4 border-dashed border-[#FFD699] bg-[#FFFAF2]"
                          style={{ width: 150, height: 161 }}
                        >
                          <AvatarWidgetOverlay />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Frame className="w-8 h-8 text-[#FFD699]" />
                          </div>
                        </div>

                        <h3 className="text-lg font-bold text-[#1A1A1A] mb-1">头像挂件生成流程</h3>
                        <p className="text-[#999999] text-xs font-medium mb-6 max-w-xs mx-auto">
                          按以下步骤配置参数，AI 将自动生成符合微博 UDC 规范的挂件
                        </p>

                        {/* Flow steps */}
                        <div className="space-y-2 text-left">
                          {[
                            { step: '01', label: '选择模型包', desc: '从左侧选择 Checkpoint 基础模型' },
                            { step: '02', label: '选择 LoRA 风格包', desc: '可选加载 LoRA 微调风格，不选则使用基础模型' },
                            { step: '03', label: '添加补充描述', desc: '输入自定义关键词，如"熊猫"、"圣诞"，或点击智能优化' },
                            { step: '04', label: '生成并下载', desc: 'AI 生成后可预览规范标注，下载 PNG' },
                          ].map((item) => (
                            <div key={item.step} className="flex gap-3 px-3 py-2.5 rounded-xl bg-[#FFFAF2] border border-[#FFE8CC]">
                              <span className="shrink-0 w-6 h-6 rounded-lg bg-weibo-orange text-white text-[10px] font-bold flex items-center justify-center">{item.step}</span>
                              <div>
                                <div className="text-xs font-bold text-[#1A1A1A]">{item.label}</div>
                                <div className="text-[10px] text-[#999999] mt-0.5">{item.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="p-8 border-t border-[#FFE8CC]/50 bg-white/50 backdrop-blur-md flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-[#999999] uppercase tracking-widest">WeAgent Engine Online</span>
                    </div>
                    <div className="h-4 w-[1px] bg-[#FFE8CC]" />
                    <div className="text-[10px] font-bold text-[#5A5A5A] uppercase tracking-widest truncate max-w-[160px]">
                      {selectedCheckpoint ? selectedCheckpoint.replace(/\.[^.]+$/, '') : '挂件规范: UDC v2.1'}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-[#999999] uppercase tracking-widest">
                    Canvas: 250×268 px · GIF/PNG
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

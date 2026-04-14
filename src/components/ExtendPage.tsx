import React, { useState, useRef } from 'react';
import { MoveHorizontal, Upload, RefreshCcw, Sparkles, Image as ImageIcon, Download, RefreshCw, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HistoryItem } from '../types';

interface ExtendPageProps {
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
}

export const ExtendPage: React.FC<ExtendPageProps> = ({ onAddHistory }) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>(['1080x1080']);
  const [customTarget, setCustomTarget] = useState({ width: '', height: '' });
  const [isExtending, setIsExtending] = useState(false);
  const [extendedResults, setExtendedResults] = useState<{ id: string; url: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCustomSize, setShowCustomSize] = useState(false);

  const targets = [
    { id: '1080x1080', name: '方形', detail: '1080×1080', icon: 'aspect-square' },
    { id: '1920x1080', name: '横屏', detail: '1920×1080', icon: 'aspect-video' },
    { id: '1080x1920', name: '竖屏', detail: '1080×1920', icon: 'aspect-[9/16]' },
    { id: '1440x2560', name: '超清竖屏', detail: '1440×2560', icon: 'aspect-[9/16]' },
    { id: '2560x1440', name: '超清横屏', detail: '2560×1440', icon: 'aspect-video' },
    { id: 'custom', name: '自定义尺寸', detail: '自定义', icon: 'settings' },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setExtendedResults([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleToggleTarget = (id: string) => {
    if (id === 'custom') {
      setShowCustomSize(!showCustomSize);
    } else {
      setSelectedTargets(prev =>
        prev.includes(id)
          ? (prev.length > 1 ? prev.filter(t => t !== id) : prev)
          : [...prev, id]
      );
    }
  };

  const handleCustomSizeChange = (field: 'width' | 'height', value: string) => {
    setCustomTarget(prev => ({ ...prev, [field]: value }));
  };

  const handleExtend = async () => {
    if (!uploadedImage) return;
    setIsExtending(true);
    setExtendedResults([]);
    setErrorMsg(null);

    // 从 data URL 提取 mimeType 和 base64
    const match = uploadedImage.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      setIsExtending(false);
      return;
    }
    const mimeType = match[1];
    const imageBase64 = match[2];

    // 用 canvas 测量原始图片尺寸，服务端计算扩展比例时需要
    const { sourceWidth, sourceHeight } = await new Promise<{ sourceWidth: number; sourceHeight: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ sourceWidth: img.naturalWidth, sourceHeight: img.naturalHeight });
      img.src = uploadedImage!;
    });

    try {
      const results: { id: string; url: string }[] = [];

      for (const targetId of selectedTargets) {
        let targetWidth = '';
        let targetHeight = '';
        if (targetId === 'custom') {
          targetWidth = customTarget.width;
          targetHeight = customTarget.height;
        } else {
          const [w, h] = targetId.split('x');
          targetWidth = w;
          targetHeight = h;
        }

        const res = await fetch('/api/extend-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64, mimeType, targetWidth, targetHeight, sourceWidth, sourceHeight }),
        });

        const data = await res.json();
        if (!res.ok || !data.url) {
          console.error('[ExtendPage] API error:', data);
          continue;
        }

        results.push({
          id: targetId === 'custom' ? `${targetWidth}x${targetHeight}` : targetId,
          url: data.url,
        });
      }

      setExtendedResults(results);
      // 每个延展结果都写入历史
      for (const r of results) {
        onAddHistory({
          title: `图片延展 ${r.id.replace('x', '×')}`,
          style: '智能延展',
          size: r.id.replace('x', '×'),
          imageUrl: r.url,
          type: 'extend',
        });
      }
    } catch (err) {
      console.error('[ExtendPage]', err);
      setErrorMsg(err instanceof Error ? err.message : '扩图请求失败，请重试');
    } finally {
      setIsExtending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="mb-16 relative">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 text-weibo-orange font-bold text-xs uppercase tracking-[0.3em] mb-4"
        >
          <div className="w-8 h-[2px] bg-weibo-orange" />
          AI Expansion Engine
        </motion.div>
        <h1 className="font-serif text-6xl font-bold text-[#1A1A1A] mb-6 tracking-normal leading-tight">
          智能扩图 <span className="text-gradient-weibo italic inline-block pr-4">Studio</span>
        </h1>
        <p className="text-[#5A5A5A] text-xl max-w-2xl font-light leading-relaxed">
          无缝扩展您的视觉资产，智能填充边缘细节，完美适配各种终端屏幕尺寸。
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-4 space-y-8">
          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-[2.5rem] p-8"
          >
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-3">
              <div className="w-1 h-5 bg-weibo-orange rounded-full" />
              上传原图
            </h2>
            
            {!uploadedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#FFD699] rounded-2xl p-12 text-center cursor-pointer bg-[#FFFAF2]/50 hover:bg-weibo-orange/[0.03] hover:border-weibo-orange transition-all group"
              >
                <Upload className="w-10 h-10 mx-auto mb-4 text-[#999999] group-hover:text-weibo-orange group-hover:scale-110 transition-all" />
                <p className="text-sm font-bold text-[#1A1A1A]">选择或拖拽图片</p>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
              </div>
            ) : (
              <div className="relative group rounded-2xl overflow-hidden border-2 border-[#FFE8CC]">
                <img src={uploadedImage} className="w-full aspect-square object-cover" alt="Original" />
                <button 
                  onClick={() => { setUploadedImage(null); setExtendedResults([]); }}
                  className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-md text-red-500 rounded-xl shadow-lg hover:bg-red-50 transition-all"
                >
                  <RefreshCcw className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-[2.5rem] p-8"
          >
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-6 flex items-center gap-3">
              <div className="w-1 h-5 bg-weibo-orange rounded-full" />
              扩展目标
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {targets.map((target) => (
                <button
                  key={target.id}
                  onClick={() => handleToggleTarget(target.id)}
                  className={`py-4 px-4 rounded-2xl text-xs font-bold border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedTargets.includes(target.id)
                      ? 'border-weibo-orange bg-weibo-orange text-white shadow-lg shadow-weibo-orange/20'
                      : 'border-[#FFE8CC] bg-white text-[#5A5A5A] hover:border-weibo-orange/30'
                  }`}
                >
                  <div className={`w-6 h-6 rounded border border-current/20 ${target.icon}`} />
                  {target.name}
                </button>
              ))}
            </div>

            {showCustomSize && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-4 p-4 bg-[#FFFAF2] rounded-2xl border-2 border-[#FFE8CC]"
              >
                <h3 className="text-base font-bold text-[#1A1A1A] mb-4">自定义尺寸</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#5A5A5A] uppercase tracking-widest mb-2">宽度 (px)</label>
                    <input
                      type="number"
                      value={customTarget.width}
                      onChange={(e) => handleCustomSizeChange('width', e.target.value)}
                      placeholder="例如: 1080"
                      className="w-full px-3 py-2 border-2 border-[#FFE8CC] rounded-xl text-sm focus:border-weibo-orange focus:ring-2 focus:ring-weibo-orange/20 outline-none"
                      min="1"
                      max="4096"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#5A5A5A] uppercase tracking-widest mb-2">高度 (px)</label>
                    <input
                      type="number"
                      value={customTarget.height}
                      onChange={(e) => handleCustomSizeChange('height', e.target.value)}
                      placeholder="例如: 1080"
                      className="w-full px-3 py-2 border-2 border-[#FFE8CC] rounded-xl text-sm focus:border-weibo-orange focus:ring-2 focus:ring-weibo-orange/20 outline-none"
                      min="1"
                      max="4096"
                    />
                  </div>
                </div>
                {customTarget.width && customTarget.height && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedTargets(['custom']);
                        setShowCustomSize(false);
                      }}
                      className="flex-1 px-4 py-2 bg-weibo-orange text-white rounded-xl text-xs font-bold hover:bg-weibo-orange-dark transition-all"
                    >
                      确认尺寸
                    </button>
                    <button
                      onClick={() => setShowCustomSize(false)}
                      className="px-4 py-2 bg-white border-2 border-[#FFE8CC] text-[#5A5A5A] rounded-xl text-xs font-bold hover:bg-[#FFFAF2] transition-all"
                    >
                      取消
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </motion.section>

          <button
            onClick={handleExtend}
            disabled={isExtending || !uploadedImage}
            className="w-full py-6 bg-gradient-to-r from-weibo-orange to-weibo-orange-dark text-white rounded-[2rem] font-bold text-lg shadow-2xl shadow-weibo-orange/30 hover:shadow-weibo-orange/50 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3 btn-tactile"
          >
            {isExtending ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <MoveHorizontal className="w-6 h-6" />
            )}
            {isExtending ? '正在智能补全...' : '立即开始无缝扩展'}
          </button>
          {errorMsg && (
            <div className="mt-4 px-5 py-3 bg-red-50 border border-red-200 rounded-2xl text-sm font-bold text-red-600 text-center">
              {errorMsg}
            </div>
          )}
        </div>

        <div className="lg:col-span-8">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-card rounded-[3rem] p-4 min-h-[600px] flex flex-col relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none" />
            
            <div className="flex-1 flex items-center justify-center p-8">
              <AnimatePresence mode="wait">
                {isExtending ? (
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
                        <MoveHorizontal className="w-10 h-10 text-weibo-orange animate-pulse" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-[#1A1A1A] mb-4">正在进行无缝补全</h3>
                    <p className="text-[#999999] text-sm font-medium max-w-xs mx-auto leading-relaxed">
                      AI 正在分析原图的纹理、光影与构图，为您生成自然的边缘扩展内容...
                    </p>
                  </motion.div>
                ) : extendedResults.length > 0 ? (
                  <motion.div
                    key="result"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full h-full flex flex-col items-center"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full overflow-y-auto max-h-[500px] p-2">
                      {extendedResults.map((result) => (
                        <div key={result.id} className="relative group rounded-[1.5rem] overflow-hidden shadow-xl border-4 border-white bg-white flex flex-col">
                          <div className="relative aspect-square bg-[#FFFAF2] flex items-center justify-center overflow-hidden">
                            <img
                              src={result.url}
                              alt={result.id}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="p-3 bg-white border-t border-[#FFE8CC] flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#5A5A5A] uppercase tracking-widest">{result.id}</span>
                            <button
                              className="p-2 text-weibo-orange hover:bg-weibo-orange/10 rounded-lg transition-colors"
                              onClick={() => {
                                const a = document.createElement('a');
                                a.href = result.url;
                                a.download = `extend-${result.id}.png`;
                                a.target = '_blank';
                                a.click();
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-10 flex gap-4">
                      <button
                        onClick={handleExtend}
                        className="px-8 py-3 bg-white border-2 border-[#FFE8CC] text-[#5A5A5A] rounded-2xl font-bold text-sm hover:bg-[#FFFAF2] transition-all flex items-center gap-2 btn-tactile"
                      >
                        <RefreshCw className="w-4 h-4" />
                        重新扩展
                      </button>
                      <button
                        onClick={() => extendedResults.forEach((r, i) => setTimeout(() => {
                          const a = document.createElement('a');
                          a.href = r.url;
                          a.download = `extend-${r.id}.png`;
                          a.target = '_blank';
                          a.click();
                        }, i * 400))}
                        className="px-8 py-3 bg-[#1A1A1A] text-white rounded-2xl font-bold text-sm hover:bg-black transition-all flex items-center gap-2 btn-tactile shadow-xl">
                        <Sparkles className="w-4 h-4" />
                        全部导出
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
                      <MoveHorizontal className="w-10 h-10 text-[#FFD699]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">等待原图载入</h3>
                    <p className="text-[#999999] text-sm font-medium max-w-xs mx-auto">
                      上传一张图片并选择目标比例，AI 将为您智能扩展画面。
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-8 border-t border-[#FFE8CC]/50 bg-white/50 backdrop-blur-md flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-[#999999] uppercase tracking-widest">Expansion Engine Ready</span>
                </div>
                <div className="h-4 w-[1px] bg-[#FFE8CC]" />
                <div className="text-[10px] font-bold text-[#5A5A5A] uppercase tracking-widest">Targets: {selectedTargets.join(', ')}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

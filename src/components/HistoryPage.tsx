import React, { useState } from 'react';
import { Download, Eye, Trash2, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HistoryItem } from '../types';

interface HistoryPageProps {
  history: HistoryItem[];
  onClearHistory: () => void;
  onDeleteItem: (id: string) => void;
}

const TYPE_LABEL: Record<string, string> = {
  generate: '通用生成',
  widget: '头像挂件',
  extend: '图片延展',
};

export const HistoryPage: React.FC<HistoryPageProps> = ({ history, onClearHistory, onDeleteItem }) => {
  const [clearSuccess, setClearSuccess] = useState(false);
  const [previewItem, setPreviewItem] = useState<HistoryItem | null>(null);

  const handleClearHistory = () => {
    onClearHistory();
    setClearSuccess(true);
    setTimeout(() => setClearSuccess(false), 2000);
  };

  const handleDownload = (url: string, title: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}-${Date.now()}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchDownload = () => {
    history.forEach((item, i) => {
      setTimeout(() => handleDownload(item.imageUrl, item.title), i * 400);
    });
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {/* 预览 Modal */}
      <AnimatePresence>
        {previewItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8"
            onClick={() => setPreviewItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative bg-white rounded-[2rem] overflow-hidden shadow-2xl max-w-2xl w-full"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewItem(null)}
                className="absolute top-4 right-4 z-10 w-9 h-9 bg-black/50 rounded-full text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <img src={previewItem.imageUrl} className="w-full object-contain max-h-[70vh]" alt={previewItem.title} />
              <div className="p-6">
                <h4 className="font-bold text-[#1A1A1A] mb-1">{previewItem.title}</h4>
                <p className="text-xs text-[#999999]">{previewItem.timestamp} · {previewItem.size} · {previewItem.style}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="mb-16 relative">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 text-weibo-orange font-bold text-xs uppercase tracking-[0.3em] mb-4"
        >
          <div className="w-8 h-[2px] bg-weibo-orange" />
          Asset Archives
        </motion.div>
        <h1 className="font-serif text-6xl font-bold text-[#1A1A1A] mb-6 tracking-normal leading-tight">
          历史记录 <span className="text-gradient-weibo italic inline-block pr-4">Archives</span>
        </h1>
        <p className="text-[#5A5A5A] text-xl max-w-2xl font-light leading-relaxed">
          回顾并管理您过去的所有创意资产，随时重新下载或进一步优化。
        </p>
      </header>

      <div className="glass-card rounded-[3rem] p-10">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-weibo-orange/10 rounded-2xl flex items-center justify-center">
              <Eye className="w-6 h-6 text-weibo-orange" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1A1A1A]">最近生成的资产</h2>
              <p className="text-xs font-bold text-[#999999] uppercase tracking-widest">Total {history.length} Items</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleBatchDownload}
              disabled={history.length === 0}
              className="px-6 py-3 bg-white border-2 border-[#FFE8CC] text-[#5A5A5A] rounded-xl text-xs font-bold hover:bg-[#FFFAF2] transition-all flex items-center gap-2 btn-tactile disabled:opacity-50 disabled:cursor-not-allowed">
              <Download className="w-4 h-4" />
              批量下载
            </button>
            <button
              onClick={handleClearHistory}
              disabled={history.length === 0}
              className="px-6 py-3 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-2 border border-red-100 disabled:opacity-50 disabled:cursor-not-allowed relative"
            >
              <Trash2 className="w-4 h-4" />
              清空记录
              <AnimatePresence>
                {clearSuccess && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="absolute -top-12 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 shadow-lg"
                  >
                    <CheckCircle className="w-4 h-4" />
                    已清空
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="py-32 text-center">
            <div className="w-20 h-20 bg-[#FFFAF2] rounded-3xl flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-[#FFD699]">
              <Eye className="w-8 h-8 text-[#FFD699]" />
            </div>
            <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">暂无历史记录</h3>
            <p className="text-[#999999] text-sm font-medium">开始您的第一次创作，记录将自动保存在这里。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {history.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-white rounded-[2rem] overflow-hidden border-2 border-[#FFE8CC] hover:border-weibo-orange/30 transition-all hover:shadow-2xl hover:-translate-y-2"
              >
                <div className="aspect-square overflow-hidden bg-[#FFFAF2] relative">
                  <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={item.type} />
                  <div className="absolute top-4 left-4">
                    <div className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-xl text-[10px] font-bold text-weibo-orange shadow-lg border border-black/5 uppercase tracking-widest">
                      {TYPE_LABEL[item.type] ?? item.type}
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                    <button
                      onClick={() => handleDownload(item.imageUrl, item.title)}
                      className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-weibo-orange hover:scale-110 transition-transform shadow-xl"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPreviewItem(item)}
                      className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-weibo-orange hover:scale-110 transition-transform shadow-xl">
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDeleteItem(item.id)}
                      className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform shadow-xl">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-[#999999] uppercase tracking-widest">{item.timestamp}</span>
                    <span className="text-[10px] font-bold text-[#999999] uppercase tracking-widest">ID: {item.id}</span>
                  </div>
                  <h4 className="font-bold text-[#1A1A1A] text-sm truncate mb-1">
                    {item.title}
                  </h4>
                  <p className="text-xs text-[#999999] font-medium">{item.size} · {item.style}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

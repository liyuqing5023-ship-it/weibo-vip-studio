import React from 'react';
import { Search, Sparkles, MoveHorizontal, FolderOpen, FileText } from 'lucide-react';
import { PageType } from '../types';
import { motion } from 'motion/react';

interface SidebarProps {
  activePage: PageType;
  onPageChange: (page: PageType) => void;
}

const WeiboLogo = () => (
  <img src="/weibo-vip-logo.png" alt="Weibo VIP Logo" className="w-10 h-10" />
);

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange }) => {
  const navItems = [
    { id: 'audit', label: '图片审核', icon: Search },
    { id: 'generate', label: '图片生成', icon: Sparkles },
    { id: 'extend', label: '图片延展', icon: MoveHorizontal },
    { id: 'spec', label: '规范指南', icon: FileText },
  ];

  return (
    <aside className="w-72 bg-white/80 backdrop-blur-2xl border-r border-[#FFE8CC] p-8 flex flex-col fixed h-screen top-0 left-0 z-50">
      <div className="logo-shine relative overflow-hidden bg-gradient-to-br from-weibo-orange to-weibo-gold rounded-full p-5 shadow-lg shadow-weibo-orange/20 mb-12 flex items-center gap-4 group cursor-pointer">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500 overflow-hidden">
          <img src="/weibo-vip-logo.png" alt="Weibo VIP Logo" className="w-10 h-10 rounded-full object-cover" />
        </div>
        <div className="text-white font-serif">
          <h1 className="text-xl font-bold tracking-tight leading-none">Weibo VIP</h1>
          <p className="text-[10px] opacity-80 font-medium tracking-[0.2em] mt-1 uppercase">Studio</p>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onPageChange(item.id as PageType)}
            className={`flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-500 relative overflow-hidden group btn-tactile ${
              activePage === item.id
                ? 'bg-weibo-orange/10 text-weibo-orange font-bold shadow-sm'
                : 'text-[#5A5A5A] hover:text-weibo-orange hover:bg-weibo-orange/5'
            }`}
          >
            {activePage === item.id && (
              <motion.div
                layoutId="activeNav"
                className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-weibo-orange to-weibo-gold rounded-r-full"
              />
            )}
            <item.icon className={`w-5 h-5 transition-transform duration-500 ${activePage === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="text-sm tracking-wide">{item.label}</span>
          </button>
        ))}

        <div className="mt-10 pt-8 border-t border-[#FFE8CC]/50">
          <div className="text-[10px] text-[#999999] font-bold uppercase tracking-[0.2em] px-6 mb-4">
            Workspace
          </div>
          <button
            onClick={() => onPageChange('history')}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all duration-500 group btn-tactile relative overflow-hidden ${
              activePage === 'history'
                ? 'bg-weibo-orange/10 text-weibo-orange font-bold shadow-sm'
                : 'text-[#5A5A5A] hover:text-weibo-orange hover:bg-weibo-orange/5'
            }`}
          >
            {activePage === 'history' && (
              <motion.div
                layoutId="activeNav"
                className="absolute left-0 top-0 w-1 h-full bg-gradient-to-b from-weibo-orange to-weibo-gold rounded-r-full"
              />
            )}
            <FolderOpen className={`w-5 h-5 transition-transform duration-500 ${activePage === 'history' ? 'scale-110' : 'group-hover:scale-110'}`} />
            <span className="text-sm tracking-wide">生成记录</span>
          </button>
        </div>
      </nav>

      <div className="mt-auto p-5 bg-gradient-to-br from-[#FFFAF2] to-white rounded-2xl border border-[#FFE8CC] hover:shadow-md transition-all duration-500 group">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-weibo-orange to-weibo-gold flex items-center justify-center text-white font-bold text-sm shadow-md shadow-weibo-orange/20 group-hover:rotate-12 transition-transform duration-500">
            运
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-bold text-[#1A1A1A] truncate">运营用户</h4>
            <p className="text-[10px] text-[#999999] mt-0.5 font-medium">VIP Creator</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 微博会员装扮审核平台
 * 严格按照微博UDC会员设计中心规范
 * 设计师：沙莎 | 邮箱：shasha19@staff.weibo.com
 */

import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { AuditPage } from './components/AuditPage';
import { GeneratePage } from './components/GeneratePage';
import { ExtendPage } from './components/ExtendPage';
import { HistoryPage } from './components/HistoryPage';
import { SpecGuidePage } from './components/SpecGuidePage';
import { PageType, HistoryItem } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [activePage, setActivePage] = useState<PageType>('audit');
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('weibo-vip-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('weibo-vip-history', JSON.stringify(history));
  }, [history]);

  const handleAddHistory = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setHistory(prev => [{
      ...item,
      id: String(Date.now()),
      timestamp,
    }, ...prev]);
  }, []);

  const handleClearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const handleDeleteHistoryItem = useCallback((id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'audit': return <AuditPage />;
      case 'generate': return <GeneratePage onAddHistory={handleAddHistory} />;
      case 'extend': return <ExtendPage onAddHistory={handleAddHistory} />;
      case 'history': return <HistoryPage history={history} onClearHistory={handleClearHistory} onDeleteItem={handleDeleteHistoryItem} />;
      case 'spec': return <SpecGuidePage />;
      default: return <AuditPage />;
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden font-sans selection:bg-weibo-orange/30">
      {/* Background Decoration */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-grid opacity-40">
        <div className="absolute -top-[10%] -right-[5%] w-[800px] h-[800px] bg-weibo-orange/10 rounded-full blur-[100px] animate-pulse duration-[10s]" />
        <div className="absolute -bottom-[15%] -left-[10%] w-[700px] h-[700px] bg-weibo-gold/10 rounded-full blur-[120px] animate-pulse duration-[8s]" />
        <div className="absolute top-[30%] left-[15%] w-[300px] h-[300px] bg-weibo-orange/5 rounded-full blur-[80px]" />
      </div>

      <Sidebar activePage={activePage} onPageChange={setActivePage} />

      <main className="flex-1 ml-72 p-12 lg:p-20 relative z-10 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

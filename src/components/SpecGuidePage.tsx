/**
 * 微博会员装扮审核规范详细说明组件
 * 严格按照微博UDC会员设计中心规范
 * 设计师：沙莎 | 邮箱：shasha19@staff.weibo.com
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, Palette, Ruler, Shield, FileText, Download, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// 通用审核原则内容
const GeneralPrinciplesContent = () => (
  <div className="space-y-6">
    <div className="p-4 bg-red-50 rounded-xl border border-red-200">
      <h4 className="font-bold text-red-700 mb-2 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        严格规范要求
      </h4>
      <ul className="space-y-2 text-sm text-red-600 list-disc list-inside">
        <li>用户上传的图片必须严格按照规范限制，<strong>不允许任何容差</strong></li>
        <li>尺寸检测要求精确匹配，<strong>不允许±1像素的偏差</strong></li>
        <li>避让区域检测：<strong>元素进入1像素即为不合格</strong></li>
        <li>配色检测：评论气泡配色容差<strong>≤3像素值</strong></li>
      </ul>
    </div>

    <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
      <h4 className="font-bold text-blue-700 mb-3">设计原则检测</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="flex items-start gap-2 p-3 bg-white rounded-lg">
          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-gray-800">清新简洁</div>
            <div className="text-xs text-gray-600">检测元素复杂度，避免过多、繁重</div>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-white rounded-lg">
          <Palette className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-gray-800">色彩搭配</div>
            <div className="text-xs text-gray-600">检测色彩和谐度</div>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-white rounded-lg">
          <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-gray-800">深色模式适配</div>
            <div className="text-xs text-gray-600">检测深色背景下的可见性和对比度</div>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-white rounded-lg">
          <Ruler className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-gray-800">避让规则</div>
            <div className="text-xs text-gray-600">严格检测避让区域，无任何元素</div>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-white rounded-lg">
          <FileText className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-gray-800">文件大小限制</div>
            <div className="text-xs text-gray-600">严格执行各类物料的文件大小限制</div>
          </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-white rounded-lg">
          <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-gray-800">命名规范</div>
            <div className="text-xs text-gray-600">检测命名规则正确性</div>
          </div>
        </div>
      </div>
    </div>

    <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
      <h4 className="font-bold text-purple-700 mb-3">颜色对比度检测标准（深色模式）</h4>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-purple-800">
          <CheckCircle className="w-4 h-4" />
          WCAG AA标准：<strong>对比度≥4.5:1</strong>
        </div>
        <div className="flex items-center gap-2 text-purple-800">
          <CheckCircle className="w-4 h-4" />
          文字与背景必须明显区分
        </div>
        <div className="flex items-center gap-2 text-purple-800">
          <CheckCircle className="w-4 h-4" />
          链接文字颜色与正文颜色有明显差别
        </div>
      </div>
    </div>
  </div>
);

// 头像挂件内容
const AvatarWidgetContent = () => (
  <div className="space-y-6">
    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
      <h4 className="font-bold text-orange-700 mb-3">尺寸检测（无容差）</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-orange-100">
            <th className="p-2 text-left font-bold text-orange-800">检测项</th>
            <th className="p-2 text-left font-bold text-orange-800">标准值</th>
            <th className="p-2 text-left font-bold text-orange-800">合格条件</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-orange-100">
            <td className="p-2">画布宽度</td>
            <td className="p-2 font-mono">250px</td>
            <td className="p-2">精确等于250px</td>
          </tr>
          <tr className="border-b border-orange-100">
            <td className="p-2">画布高度</td>
            <td className="p-2 font-mono">268px</td>
            <td className="p-2">精确等于268px</td>
          </tr>
          <tr className="border-b border-orange-100">
            <td className="p-2">分辨率</td>
            <td className="p-2 font-mono">72px</td>
            <td className="p-2">精确等于72px</td>
          </tr>
          <tr>
            <td className="p-2">文件大小</td>
            <td className="p-2 font-mono">&lt;350kb</td>
            <td className="p-2">小于350kb</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
      <h4 className="font-bold text-yellow-700 mb-3">区域检测</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-yellow-100">
            <th className="p-2 text-left font-bold text-yellow-800">区域类型</th>
            <th className="p-2 text-left font-bold text-yellow-800">位置/尺寸</th>
            <th className="p-2 text-left font-bold text-yellow-800">检测规则</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-yellow-100">
            <td className="p-2">用户头像区域</td>
            <td className="p-2 font-mono">228×228px（居中）</td>
            <td className="p-2">检测元素遮挡率，≤30%为合格</td>
          </tr>
          <tr className="border-b border-yellow-100">
            <td className="p-2">避让区域</td>
            <td className="p-2 font-mono">左右两侧向内4px</td>
            <td className="p-2"><strong>发现任何元素即为不合格</strong></td>
          </tr>
          <tr>
            <td className="p-2">V标区域</td>
            <td className="p-2 font-mono">右下角60×60px</td>
            <td className="p-2"><strong>发现重要元素即为不合格</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="p-4 bg-green-50 rounded-xl border border-green-200">
      <h4 className="font-bold text-green-700 mb-3">动画检测（如适用）</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-green-100">
            <th className="p-2 text-left font-bold text-green-800">检测项</th>
            <th className="p-2 text-left font-bold text-green-800">标准值</th>
            <th className="p-2 text-left font-bold text-green-800">合格条件</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-green-100">
            <td className="p-2">动画时长</td>
            <td className="p-2 font-mono">1-5秒</td>
            <td className="p-2">1秒≤时长≤5秒</td>
          </tr>
          <tr className="border-b border-green-100">
            <td className="p-2">帧速率</td>
            <td className="p-2 font-mono">30帧/秒</td>
            <td className="p-2">精确等于30fps</td>
          </tr>
          <tr>
            <td className="p-2">输出格式</td>
            <td className="p-2 font-mono">GIF/PNG</td>
            <td className="p-2">必须为GIF或PNG</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

// 评论气泡内容
const CommentBubbleContent = () => (
  <div className="space-y-6">
    <div className="p-4 bg-pink-50 rounded-xl border border-pink-200">
      <h4 className="font-bold text-pink-700 mb-3">配色检测（容差≤3像素值）</h4>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="p-3 bg-white rounded-lg text-center">
          <div className="w-12 h-12 rounded-lg mx-auto mb-2" style={{ backgroundColor: '#FF8F56' }}></div>
          <div className="text-xs font-bold text-gray-800">NO.1</div>
          <div className="text-[10px] font-mono text-gray-600">255,143,86</div>
          <div className="text-[9px] text-gray-500 mt-1">R:252-258</div>
          <div className="text-[9px] text-gray-500">G:140-146</div>
          <div className="text-[9px] text-gray-500">B:83-89</div>
        </div>
        <div className="p-3 bg-white rounded-lg text-center">
          <div className="w-12 h-12 rounded-lg mx-auto mb-2" style={{ backgroundColor: '#FEAD3A' }}></div>
          <div className="text-xs font-bold text-gray-800">NO.2</div>
          <div className="text-[10px] font-mono text-gray-600">254,173,58</div>
          <div className="text-[9px] text-gray-500 mt-1">R:251-255</div>
          <div className="text-[9px] text-gray-500">G:170-176</div>
          <div className="text-[9px] text-gray-500">B:55-61</div>
        </div>
        <div className="p-3 bg-white rounded-lg text-center">
          <div className="w-12 h-12 rounded-lg mx-auto mb-2" style={{ backgroundColor: '#DEC84C' }}></div>
          <div className="text-xs font-bold text-gray-800">NO.3</div>
          <div className="text-[10px] font-mono text-gray-600">222,200,76</div>
          <div className="text-[9px] text-gray-500 mt-1">R:219-225</div>
          <div className="text-[9px] text-gray-500">G:197-203</div>
          <div className="text-[9px] text-gray-500">B:73-79</div>
        </div>
        <div className="p-3 bg-white rounded-lg text-center">
          <div className="w-12 h-12 rounded-lg mx-auto mb-2" style={{ backgroundColor: '#A55DAB' }}></div>
          <div className="text-xs font-bold text-gray-800">NO.4</div>
          <div className="text-[10px] font-mono text-gray-600">165,93,171</div>
          <div className="text-[9px] text-gray-500 mt-1">R:162-168</div>
          <div className="text-[9px] text-gray-500">G:90-96</div>
          <div className="text-[9px] text-gray-500">B:168-174</div>
        </div>
        <div className="p-3 bg-white rounded-lg text-center">
          <div className="w-12 h-12 rounded-lg mx-auto mb-2" style={{ backgroundColor: '#D04666' }}></div>
          <div className="text-xs font-bold text-gray-800">NO.5</div>
          <div className="text-[10px] font-mono text-gray-600">208,70,102</div>
          <div className="text-[9px] text-gray-500 mt-1">R:205-211</div>
          <div className="text-[9px] text-gray-500">G:67-73</div>
          <div className="text-[9px] text-gray-500">B:99-105</div>
        </div>
      </div>
    </div>

    <div className="p-4 bg-rose-50 rounded-xl border border-rose-200">
      <h4 className="font-bold text-rose-700 mb-3">设计区域检测</h4>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
          <div className="w-6 h-6 bg-rose-200 rounded text-xs font-bold flex items-center justify-center text-rose-800">①</div>
          <div><strong>主元素区</strong>：根据设计确定，元素应在区域内</div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-white rounded-lg">
          <div className="w-6 h-6 bg-rose-200 rounded text-xs font-bold flex items-center justify-center text-rose-800">②</div>
          <div><strong>辅助元素区</strong>：根据设计确定，元素应在区域内</div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
          <div className="w-6 h-6 bg-red-200 rounded text-xs font-bold flex items-center justify-center text-red-800">③</div>
          <div><strong>红色避让区</strong>：固定位置，<strong>发现任何元素即为不合格</strong></div>
        </div>
        <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg border border-red-200">
          <div className="w-6 h-6 bg-red-200 rounded text-xs font-bold flex items-center justify-center text-red-800">④</div>
          <div><strong>3px避让区</strong>：画布四周3px，<strong>发现任何元素即为不合格</strong></div>
        </div>
      </div>
    </div>
  </div>
);

// 聊天气泡内容
const ChatBubbleContent = () => (
  <div className="space-y-6">
    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
      <h4 className="font-bold text-indigo-700 mb-3">点9图标记检测</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-indigo-100">
            <th className="p-2 text-left font-bold text-indigo-800">标记位置</th>
            <th className="p-2 text-left font-bold text-indigo-800">标准值</th>
            <th className="p-2 text-left font-bold text-indigo-800">检测项</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-indigo-100">
            <td className="p-2">上</td>
            <td className="p-2 font-mono">长1-4px，高1px</td>
            <td className="p-2">位置、长度、颜色(#000000)</td>
          </tr>
          <tr className="border-b border-indigo-100">
            <td className="p-2">左</td>
            <td className="p-2 font-mono">高1-4px，宽1px</td>
            <td className="p-2">位置、高度、颜色(#000000)</td>
          </tr>
          <tr className="border-b border-indigo-100">
            <td className="p-2">右</td>
            <td className="p-2 font-mono">高=气泡矩形高，宽1px</td>
            <td className="p-2">位置、高度、颜色(#000000)</td>
          </tr>
          <tr>
            <td className="p-2">下</td>
            <td className="p-2 font-mono">长=气泡矩形长，高1px</td>
            <td className="p-2">位置、长度、颜色(#000000)</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="p-4 bg-violet-50 rounded-xl border border-violet-200">
      <h4 className="font-bold text-violet-700 mb-3">文字颜色对比度检测（深色模式）</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-violet-100">
            <th className="p-2 text-left font-bold text-violet-800">检测项</th>
            <th className="p-2 text-left font-bold text-violet-800">标准值</th>
            <th className="p-2 text-left font-bold text-violet-800">检测规则</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-violet-100">
            <td className="p-2">文字与背景对比度</td>
            <td className="p-2 font-mono">≥4.5:1</td>
            <td className="p-2">WCAG AA标准</td>
          </tr>
          <tr className="border-b border-violet-100">
            <td className="p-2">链接文字颜色</td>
            <td className="p-2 font-mono">非灰色</td>
            <td className="p-2">RGB各分量≥100或≤155</td>
          </tr>
          <tr>
            <td className="p-2">链接与正文区别</td>
            <td className="p-2 font-mono">明显</td>
            <td className="p-2">检测色差值≥30</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

// 标注规则内容
const LabelingContent = () => (
  <div className="space-y-6">
    <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
      <h4 className="font-bold text-emerald-700 mb-4">标准标注类型</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-xl border-2 border-red-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-red-500 rounded-lg"></div>
            <span className="font-bold text-gray-800">红色框</span>
          </div>
          <p className="text-sm text-gray-600">标注避让区域内的元素、超出设计区域的元素、尺寸不符的内容</p>
        </div>
        <div className="p-4 bg-white rounded-xl border-2 border-yellow-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg"></div>
            <span className="font-bold text-gray-800">黄色框</span>
          </div>
          <p className="text-sm text-gray-600">标注V标区域内的元素、底部预留区的元素、安全距离不足的元素</p>
        </div>
        <div className="p-4 bg-white rounded-xl border-2 border-blue-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
            <span className="font-bold text-gray-800">蓝色框</span>
          </div>
          <p className="text-sm text-gray-600">标注不符合配色的气泡底色、颜色对比度不足的区域</p>
        </div>
        <div className="p-4 bg-white rounded-xl border-2 border-green-300">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-green-500 rounded-lg"></div>
            <span className="font-bold text-gray-800">绿色框</span>
          </div>
          <p className="text-sm text-gray-600">标注正确的点9图标记、符合规范的设计元素</p>
        </div>
      </div>
    </div>

    <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
      <h4 className="font-bold text-teal-700 mb-4">常用文字标签</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">尺寸不符</div>
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">进入避让区</div>
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">遮挡过多</div>
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">配色不符</div>
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">遮挡文字</div>
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">超出区域</div>
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">点9标记错误</div>
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">对比度不足</div>
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">文件过大</div>
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">格式错误</div>
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">命名错误</div>
        <div className="px-3 py-2 bg-white rounded-lg text-xs font-bold text-gray-700 border border-gray-200">字数超限</div>
      </div>
    </div>
  </div>
);

interface SpecCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  content: React.ReactNode;
}

const SPEC_CATEGORIES: SpecCategory[] = [
  {
    id: 'general',
    name: '通用审核原则',
    icon: Shield,
    color: 'bg-blue-500',
    content: <GeneralPrinciplesContent />
  },
  {
    id: 'avatar-widget',
    name: '头像挂件',
    icon: Ruler,
    color: 'bg-orange-500',
    content: <AvatarWidgetContent />
  },
  {
    id: 'comment-bubble',
    name: '评论气泡',
    icon: Palette,
    color: 'bg-pink-500',
    content: <CommentBubbleContent />
  },
  {
    id: 'chat-bubble',
    name: '聊天气泡',
    icon: MessageSquare,
    color: 'bg-indigo-500',
    content: <ChatBubbleContent />
  },
  {
    id: 'labeling',
    name: '标注规则',
    icon: CheckCircle,
    color: 'bg-emerald-500',
    content: <LabelingContent />
  }
];

export const SpecGuidePage: React.FC = () => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleDownload = (type: 'pdf' | 'excel') => {
    // Simulate download
    const link = document.createElement('a');
    link.href = '#'; // Replace with actual download URL
    link.download = type === 'pdf' ? 'weibo-vip-specs.pdf' : 'weibo-vip-audit-template.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(type);
    setTimeout(() => setDownloadSuccess(null), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">
      <header className="mb-12">
        <div className="flex items-center gap-3 text-weibo-orange font-bold text-xs uppercase tracking-[0.3em] mb-4">
          <div className="w-8 h-[2px] bg-weibo-orange" />
          Design Specifications
        </div>
        <h1 className="font-serif text-5xl font-bold text-[#1A1A1A] mb-6 tracking-normal leading-tight">
          审核规范指南
        </h1>
        <p className="text-[#5A5A5A] text-lg max-w-2xl font-light leading-relaxed">
          微博UDC会员设计中心官方审核规范，严格按照以下标准进行设计稿审核。
        </p>
      </header>

      <div className="space-y-4">
        {SPEC_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const isExpanded = expandedCategory === category.id;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border-2 border-[#FFE8CC] overflow-hidden hover:border-weibo-orange/30 transition-all"
            >
              <button
                onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                className="w-full p-6 flex items-center justify-between hover:bg-[#FFFAF2]/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${category.color} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold text-[#1A1A1A]">{category.name}</h3>
                    <p className="text-xs text-[#999999] font-medium uppercase tracking-wider">
                      {isExpanded ? '点击收起' : '点击展开详情'}
                    </p>
                  </div>
                </div>
                <div className={`w-10 h-10 rounded-full bg-[#FFFAF2] flex items-center justify-center transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-weibo-orange" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-weibo-orange" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-6 border-t border-[#FFE8CC]">
                      {category.content}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-12 p-8 bg-gradient-to-br from-[#FFFAF2] to-white rounded-[2.5rem] border border-[#FFE8CC]">
        <h3 className="text-xl font-bold text-[#1A1A1A] mb-6 flex items-center gap-3">
          <Download className="w-6 h-6 text-weibo-orange" />
          下载完整规范文档
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleDownload('pdf')}
            className="p-4 bg-white rounded-2xl border-2 border-[#FFE8CC] hover:border-weibo-orange/50 hover:shadow-lg transition-all text-left relative"
          >
            <div className="font-bold text-[#1A1A1A] mb-1">PDF完整规范文档</div>
            <div className="text-xs text-[#5A5A5A]">包含所有装扮类型的详细审核标准</div>
            <AnimatePresence>
              {downloadSuccess === 'pdf' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 shadow-lg"
                >
                  <CheckCircle className="w-3 h-3" />
                  下载成功
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={() => handleDownload('excel')}
            className="p-4 bg-white rounded-2xl border-2 border-[#FFE8CC] hover:border-weibo-orange/50 hover:shadow-lg transition-all text-left relative"
          >
            <div className="font-bold text-[#1A1A1A] mb-1">Excel审核模板</div>
            <div className="text-xs text-[#5A5A5A]">批量审核使用的标准模板</div>
            <AnimatePresence>
              {downloadSuccess === 'excel' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute -top-10 left-1/2 -translate-x-1/2 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-2 shadow-lg"
                >
                  <CheckCircle className="w-3 h-3" />
                  下载成功
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </div>
  );
};
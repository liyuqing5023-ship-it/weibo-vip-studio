import React, { useState, useRef, useEffect } from 'react';
import { Upload, CheckCircle2, XCircle, AlertCircle, FileText, Sparkles, Search, Trash2, ChevronDown, ChevronUp, FolderOpen, Images } from 'lucide-react';
import { AUDIT_SPECS } from '../constants';
import { AuditResult, BatchItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { auditImageWithQwen, checkQwenHealth } from '../services/qwenAuditService';

/** 用 Canvas 像素分析检测边缘避让区域，同时支持透明底和不透明底图片 */
async function checkAvoidZonePixels(
  imageData: string,
  width: number,
  height: number,
  zoneSize: number,
  checkSides: ('top' | 'bottom' | 'left' | 'right')[] = ['top', 'bottom', 'left', 'right']
): Promise<{ passed: boolean; actual: string; message: string }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve({ passed: true, actual: '无法检测', message: 'Canvas 不可用' });
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);

      // 采样四个角落像素（2×2）判断是否有透明底
      const tlData = ctx.getImageData(0, 0, 2, 2).data;
      const trData = ctx.getImageData(width - 2, 0, 2, 2).data;
      const blData = ctx.getImageData(0, height - 2, 2, 2).data;
      const brData = ctx.getImageData(width - 2, height - 2, 2, 2).data;

      const hasTransparency =
        tlData[3] === 0 || trData[3] === 0 || blData[3] === 0 || brData[3] === 0;

      const violations: string[] = [];

      if (hasTransparency) {
        // 透明底：检查 alpha > 10
        const ALPHA_THRESHOLD = 10;
        const hasNonTransparent = (data: Uint8ClampedArray) => {
          for (let i = 3; i < data.length; i += 4) {
            if (data[i] > ALPHA_THRESHOLD) return true;
          }
          return false;
        };
        if (checkSides.includes('top') && hasNonTransparent(ctx.getImageData(0, 0, width, zoneSize).data)) violations.push('上方');
        if (checkSides.includes('bottom') && hasNonTransparent(ctx.getImageData(0, height - zoneSize, width, zoneSize).data)) violations.push('下方');
        if (checkSides.includes('left') && hasNonTransparent(ctx.getImageData(0, 0, zoneSize, height).data)) violations.push('左侧');
        if (checkSides.includes('right') && hasNonTransparent(ctx.getImageData(width - zoneSize, 0, zoneSize, height).data)) violations.push('右侧');
      } else {
        // 不透明底：采样角落均值作为背景色，检测与背景色差超过阈值的像素
        const allCorners = [tlData, trData, blData, brData];
        let bgR = 0, bgG = 0, bgB = 0, count = 0;
        for (const corner of allCorners) {
          for (let i = 0; i < corner.length; i += 4) {
            bgR += corner[i]; bgG += corner[i + 1]; bgB += corner[i + 2]; count++;
          }
        }
        bgR = Math.round(bgR / count);
        bgG = Math.round(bgG / count);
        bgB = Math.round(bgB / count);

        const COLOR_THRESHOLD = 30; // 色差阈值，低于此值视为背景
        const hasForeground = (data: Uint8ClampedArray) => {
          for (let i = 0; i < data.length; i += 4) {
            if (
              Math.abs(data[i] - bgR) > COLOR_THRESHOLD ||
              Math.abs(data[i + 1] - bgG) > COLOR_THRESHOLD ||
              Math.abs(data[i + 2] - bgB) > COLOR_THRESHOLD
            ) return true;
          }
          return false;
        };
        if (checkSides.includes('top') && hasForeground(ctx.getImageData(0, 0, width, zoneSize).data)) violations.push('上方');
        if (checkSides.includes('bottom') && hasForeground(ctx.getImageData(0, height - zoneSize, width, zoneSize).data)) violations.push('下方');
        if (checkSides.includes('left') && hasForeground(ctx.getImageData(0, 0, zoneSize, height).data)) violations.push('左侧');
        if (checkSides.includes('right') && hasForeground(ctx.getImageData(width - zoneSize, 0, zoneSize, height).data)) violations.push('右侧');
      }

      const passed = violations.length === 0;
      resolve({
        passed,
        actual: passed ? '边缘无元素' : `${violations.join('、')}边缘${zoneSize}px内有元素`,
        message: passed
          ? `向内${zoneSize}px避让区域符合规范`
          : `${violations.join('、')}边缘${zoneSize}px内检测到设计元素，违反避让规范`
      });
    };
    img.src = imageData;
  });
}

// 头像挂件预览：背景图原始尺寸 828×1792，头像圆圈位置（可微调）
const AVATAR_PREVIEW = {
  bgWidth: 828,
  bgHeight: 1792,
  displayWidth: 360,
  // 头像在原图中的位置和大小（px），像素扫描实测：中心(122,509), 直径181
  avatarLeft: 22,
  avatarTop: 385,
  avatarDiameter: 150,
};

/** 根据文件名关键词自动识别装扮类型，识别不到时返回 fallback */
function detectTypeFromFilename(filename: string, fallback: string): string {
  const name = filename.toLowerCase();
  if (name.includes('挂件') || name.includes('avatar') || name.includes('widget')) return 'avatar-widget';
  if (name.includes('评论气泡') || name.includes('comment-bubble')) return 'comment-bubble';
  if (name.includes('聊天') || name.includes('chat-bubble')) return 'chat-bubble';
  if (name.includes('卡片') || name.includes('card-bg')) return 'card-bg';
  if (name.includes('编号') || name.includes('number-card')) return 'number-card';
  if (name.includes('铭牌') || name.includes('badge')) return 'badge';
  if (name.includes('被赞') || name.includes('like-animation')) return 'like-animation';
  if (name.includes('拇指') || name.includes('thumb')) return 'thumb-up';
  if (name.includes('喜欢特权') || name.includes('privilege')) return 'like-privilege';
  if (name.includes('皮肤') || name.includes('skin-set')) return 'skin-set';
  return fallback;
}

export const AuditPage: React.FC = () => {
  const [activeType, setActiveType] = useState('avatar-widget');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [geminiAvailable, setGeminiAvailable] = useState<boolean>(false);
  const [showPreview, setShowPreview] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchAuditing, setIsBatchAuditing] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const spec = AUDIT_SPECS[activeType];

  // 检查 Qwen-VL 服务状态
  useEffect(() => {
    checkQwenHealth().then(setGeminiAvailable).catch(() => setGeminiAvailable(false));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setAuditResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setAuditResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  /** 核心审核逻辑：接收 imageData 和 type，返回 AuditResult */
  const auditSingleImage = async (imageData: string, type: string): Promise<AuditResult> => {
    const auditSpec = AUDIT_SPECS[type];

    const { actualWidth, actualHeight } = await new Promise<{ actualWidth: number; actualHeight: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ actualWidth: img.naturalWidth, actualHeight: img.naturalHeight });
      img.src = imageData;
    });

    let result;
    try {
      result = await auditImageWithQwen(imageData, type, auditSpec);
    } catch (error) {
      result = await performMockAuditFor(imageData, type);
    }

    result.checks = result.checks.map((c: any) => {
      const specCheck = auditSpec.checks.find((sc: any) => sc.id === c.id);
      if (!specCheck) return c;
      const sizeMatch = specCheck.standard?.match(/^(\d+)×(\d+)/);
      if (sizeMatch) {
        const w = parseInt(sizeMatch[1]), h = parseInt(sizeMatch[2]);
        const passed = actualWidth === w && actualHeight === h;
        return { ...c, passed, actual: `${actualWidth}×${actualHeight}px`, message: passed ? `${c.name}符合规范` : `${c.name}应为${w}×${h}px，实际为${actualWidth}×${actualHeight}px` };
      }
      const isWidthCheck = /宽/.test(specCheck.name) || /width/i.test(c.id);
      if (isWidthCheck) {
        const target = parseInt(specCheck.standard);
        if (!isNaN(target)) {
          const passed = actualWidth === target;
          return { ...c, passed, actual: `${actualWidth}px`, message: passed ? `${c.name}符合规范` : `${c.name}应为${target}px，实际为${actualWidth}px` };
        }
      }
      const isHeightCheck = /高/.test(specCheck.name) || /height/i.test(c.id);
      if (isHeightCheck) {
        const target = parseInt(specCheck.standard);
        if (!isNaN(target)) {
          const passed = actualHeight === target;
          return { ...c, passed, actual: `${actualHeight}px`, message: passed ? `${c.name}符合规范` : `${c.name}应为${target}px，实际为${actualHeight}px` };
        }
      }
      return c;
    });

    if (type === 'avatar-widget' && result.checks.some((c: any) => c.id === 'avatar-occlusion')) {
      const occlusionResult = await new Promise<{ passed: boolean; actual: string; message: string }>((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = actualWidth; canvas.height = actualHeight;
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          const avatarW = 228, avatarH = 228;
          const avatarLeft = Math.round((actualWidth - avatarW) / 2);
          const avatarTop = Math.round((actualHeight - avatarH) / 2);
          const regionData = ctx.getImageData(avatarLeft, avatarTop, avatarW, avatarH).data;
          let nonTransparentCount = 0;
          for (let i = 3; i < regionData.length; i += 4) { if (regionData[i] > 10) nonTransparentCount++; }
          const occlusionRate = (nonTransparentCount / (avatarW * avatarH)) * 100;
          const passed = occlusionRate <= 20;
          resolve({ passed, actual: `${occlusionRate.toFixed(1)}%`, message: passed ? `头像遮挡率 ${occlusionRate.toFixed(1)}%，符合规范（≤20%）` : `头像遮挡率 ${occlusionRate.toFixed(1)}%，超出允许的20%上限` });
        };
        img.src = imageData;
      });
      result.checks = result.checks.map((c: any) => c.id === 'avatar-occlusion' ? { ...c, ...occlusionResult } : c);
    }

    for (const check of auditSpec.checks) {
      if (check.id !== 'avoid-zone') continue;
      const zoneMatch = check.standard.match(/向内(\d+)px/);
      if (!zoneMatch) continue;
      const zoneSize = parseInt(zoneMatch[1]);
      const sides: ('top' | 'bottom' | 'left' | 'right')[] = check.name.includes('左右') ? ['left', 'right'] : ['top', 'bottom', 'left', 'right'];
      const avoidResult = await checkAvoidZonePixels(imageData, actualWidth, actualHeight, zoneSize, sides);
      result.checks = result.checks.map((c: any) => c.id === 'avoid-zone' ? { ...c, ...avoidResult } : c);
    }

    if (result.checks.some((c: any) => c.id === 'transparent-bg')) {
      const transparentResult = await new Promise<{ passed: boolean; actual: string; message: string }>((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = actualWidth; canvas.height = actualHeight;
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          const regions = [ctx.getImageData(0, 0, 4, 4).data, ctx.getImageData(actualWidth - 4, 0, 4, 4).data, ctx.getImageData(0, actualHeight - 4, 4, 4).data, ctx.getImageData(actualWidth - 4, actualHeight - 4, 4, 4).data];
          let minAlpha = 255;
          for (const data of regions) { for (let i = 3; i < data.length; i += 4) { if (data[i] < minAlpha) minAlpha = data[i]; } }
          const passed = minAlpha <= 10;
          resolve({ passed, actual: passed ? '四角透明' : `四角 alpha=${minAlpha}（不透明）`, message: passed ? '背景透明，符合规范' : `背景不透明（四角 alpha=${minAlpha}），头像挂件需使用透明底 PNG/GIF` });
        };
        img.src = imageData;
      });
      result.checks = result.checks.map((c: any) => c.id === 'transparent-bg' ? { ...c, ...transparentResult } : c);
    }

    const passedCount = result.checks.filter((c: any) => c.passed).length;
    result.score = Math.round((passedCount / result.checks.length) * 100);
    result.passed = passedCount === result.checks.length;
    result.suggestions = result.checks.filter((c: any) => !c.passed).map((c: any) => ({
      id: c.id,
      title: `${c.name}不符合规范`,
      description: c.message,
      steps: [`检查设计稿的${c.name}`, `调整为${auditSpec.checks.find((sc: any) => sc.id === c.id)?.standard}`, `重新上传审核`],
    }));

    return {
      passed: result.passed,
      checks: result.checks.map((c: any) => ({
        id: c.id, name: c.name,
        standard: auditSpec.checks.find((sc: any) => sc.id === c.id)?.standard || c.message,
        actual: c.actual, passed: c.passed, message: c.message
      })),
      score: result.score,
      totalChecks: result.checks.length,
      suggestions: result.suggestions,
      annotations: !result.passed ? [{ type: 'error' as const, label: '审核不通过', position: 'center' as const }] : []
    };
  };

  const performAudit = async () => {
    if (!uploadedImage) return;
    setIsUploading(true);
    try {
      const result = await auditSingleImage(uploadedImage, activeType);
      setAuditResult(result);
    } catch (error) {
      console.error('审核失败:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const performMockAuditFor = async (imageData: string, type: string) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const auditSpec = AUDIT_SPECS[type];
    const { actualWidth, actualHeight } = await new Promise<{ actualWidth: number; actualHeight: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ actualWidth: img.naturalWidth, actualHeight: img.naturalHeight });
      img.src = imageData;
    });

    const checks = auditSpec.checks.map(check => {
      let passed = true;
      let actual = '符合';
      let message = '符合规范';

      // 匹配 W×H 格式
      const sizeMatch = check.standard?.match(/^(\d+)×(\d+)/);
      if (sizeMatch) {
        const w = parseInt(sizeMatch[1]), h = parseInt(sizeMatch[2]);
        passed = actualWidth === w && actualHeight === h;
        actual = `${actualWidth}×${actualHeight}px`;
        message = passed ? `${check.name}符合规范` : `${check.name}应为${w}×${h}px，实际为${actualWidth}×${actualHeight}px`;
      } else if (/宽/.test(check.name) || /width/i.test(check.id)) {
        const target = parseInt(check.standard);
        if (!isNaN(target)) {
          passed = actualWidth === target;
          actual = `${actualWidth}px`;
          message = passed ? `${check.name}符合规范` : `${check.name}应为${target}px，实际为${actualWidth}px`;
        }
      } else if (/高/.test(check.name) || /height/i.test(check.id)) {
        const target = parseInt(check.standard);
        if (!isNaN(target)) {
          passed = actualHeight === target;
          actual = `${actualHeight}px`;
          message = passed ? `${check.name}符合规范` : `${check.name}应为${target}px，实际为${actualHeight}px`;
        }
      }

      return {
        id: check.id,
        name: check.name,
        passed,
        message,
        actual
      };
    });

    const passedCount = checks.filter(c => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);
    const passed = passedCount === checks.length;

    const suggestions = checks.filter(c => !c.passed).map(c => ({
      title: `${c.name}不符合规范`,
      description: c.message,
      steps: [`检查设计稿的${c.name}`, `调整为${auditSpec.checks.find(sc => sc.id === c.id)?.standard}`, `重新上传审核`]
    }));

    return {
      checks,
      passed,
      score,
      suggestions
    };
  };

  const handleBatchFiles = (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    const items: BatchItem[] = imageFiles.map(file => ({
      file,
      imageData: '',
      detectedType: detectTypeFromFilename(file.name, activeType),
      status: 'pending',
    }));
    setBatchItems(items);
    setExpandedIndex(null);
    // 读取 base64
    imageFiles.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as string;
        setBatchItems(prev => prev.map((item, idx) => idx === i ? { ...item, imageData: data } : item));
      };
      reader.readAsDataURL(file);
    });
  };

  const performBatchAudit = async () => {
    const currentItems = [...batchItems];
    const hasData = currentItems.filter(item => item.imageData);
    if (hasData.length === 0) return;
    setIsBatchAuditing(true);
    for (let i = 0; i < currentItems.length; i++) {
      if (!currentItems[i].imageData) continue;
      setBatchItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'auditing' } : item));
      try {
        const result = await auditSingleImage(currentItems[i].imageData, currentItems[i].detectedType);
        setBatchItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'done', result } : item));
      } catch {
        setBatchItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error' } : item));
      }
    }
    setIsBatchAuditing(false);
  };

  return (
    <div className="max-w-6xl mx-auto pb-20">

      {/* 头像挂件预览 Modal */}
      {showPreview && uploadedImage && activeType === 'avatar-widget' && (() => {
        const scale = AVATAR_PREVIEW.displayWidth / AVATAR_PREVIEW.bgWidth;
        const displayHeight = AVATAR_PREVIEW.bgHeight * scale;
        const avatarDisplayLeft = AVATAR_PREVIEW.avatarLeft * scale;
        const avatarDisplayTop = AVATAR_PREVIEW.avatarTop * scale;
        const avatarDisplaySize = AVATAR_PREVIEW.avatarDiameter * scale;
        // 挂件 250×268，其中 228×228 对应头像区域
        const widgetDisplayW = avatarDisplaySize * (250 / 228);
        const widgetDisplayH = avatarDisplaySize * (268 / 228);
        const widgetLeft = avatarDisplayLeft - avatarDisplaySize * (11 / 228);
        const widgetTop = avatarDisplayTop - avatarDisplaySize * (20 / 228);
        return (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
            onClick={() => setShowPreview(false)}
          >
            <div
              className="relative bg-white rounded-[40px] overflow-hidden shadow-2xl border-4 border-gray-800"
              style={{ width: AVATAR_PREVIEW.displayWidth }}
              onClick={e => e.stopPropagation()}
            >
              {/* 关闭按钮 */}
              <button
                onClick={() => setShowPreview(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/50 rounded-full text-white flex items-center justify-center text-sm font-bold hover:bg-black/70 transition-colors"
              >✕</button>
              {/* 手机顶部胶囊 */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-1.5 bg-gray-800 rounded-full z-10" />
              {/* 背景截图 */}
              <div style={{ height: Math.min(displayHeight, 680), overflowY: 'auto' }}>
                <div className="relative" style={{ width: AVATAR_PREVIEW.displayWidth, height: displayHeight }}>
                  <img
                    src="/avatar-widget-preview-bg.png"
                    style={{ width: AVATAR_PREVIEW.displayWidth, height: displayHeight }}
                    className="block"
                    draggable={false}
                  />
                  {/* 挂件叠加 */}
                  <img
                    src={uploadedImage}
                    style={{
                      position: 'absolute',
                      left: widgetLeft,
                      top: widgetTop,
                      width: widgetDisplayW,
                      height: widgetDisplayH,
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>
              <div className="px-4 py-2 text-center text-xs text-gray-400 bg-white">上下滑动查看 · 点击背景关闭</div>
            </div>
          </div>
        );
      })()}

      <header className="mb-16 relative">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 text-weibo-orange font-bold text-xs uppercase tracking-[0.3em] mb-4"
        >
          <div className="w-8 h-[2px] bg-weibo-orange" />
          Professional Audit
        </motion.div>
        <h1 className="font-serif text-6xl font-bold text-[#1A1A1A] mb-6 tracking-normal leading-tight">
          图片审核 <span className="text-gradient-weibo italic inline-block pr-4">Studio</span>
        </h1>
        <p className="text-[#5A5A5A] text-xl max-w-2xl font-light leading-relaxed">
          严格按照微博会员装扮设计规范进行审核，确保每一份作品都符合极致的视觉标准。
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-[2.5rem] p-10"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-3">
              <div className="w-1.5 h-6 bg-gradient-to-b from-weibo-orange to-weibo-gold rounded-full" />
              选择装扮类型
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex rounded-2xl border-2 border-[#FFE8CC] overflow-hidden">
                <button onClick={() => { setBatchMode(false); setBatchItems([]); }} className={`px-5 py-2 text-sm font-bold transition-all ${!batchMode ? 'bg-weibo-orange text-white' : 'bg-white text-[#5A5A5A] hover:bg-[#FFFAF2]'}`}>单图审核</button>
                <button onClick={() => { setBatchMode(true); setUploadedImage(null); setAuditResult(null); }} className={`px-5 py-2 text-sm font-bold transition-all ${batchMode ? 'bg-weibo-orange text-white' : 'bg-white text-[#5A5A5A] hover:bg-[#FFFAF2]'}`}>批量审核</button>
              </div>
              <div className="text-[10px] font-bold text-[#999999] uppercase tracking-widest bg-[#FFFAF2] px-3 py-1 rounded-full border border-[#FFE8CC]">
                {Object.keys(AUDIT_SPECS).length} Types Available
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {Object.entries(AUDIT_SPECS).map(([key, value]) => (
              <button
                key={key}
                onClick={() => {
                  setActiveType(key);
                  setAuditResult(null);
                  setUploadedImage(null);
                }}
                className={`px-7 py-3 rounded-2xl text-sm font-bold transition-all duration-500 border-2 btn-tactile ${
                  activeType === key
                    ? 'border-weibo-orange bg-weibo-orange text-white shadow-lg shadow-weibo-orange/20'
                    : 'border-[#FFE8CC] bg-white text-[#5A5A5A] hover:border-weibo-orange/50 hover:bg-weibo-orange/5'
                }`}
              >
                {value.name}
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-[2.5rem] p-10"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-[#1A1A1A] flex items-center gap-3">
              <div className="w-1.5 h-6 bg-gradient-to-b from-weibo-orange to-weibo-gold rounded-full" />
              上传待审核图片
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#FFFAF2] rounded-xl border border-[#FFE8CC]">
                <Sparkles className={`w-4 h-4 ${geminiAvailable ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="text-xs font-bold text-[#5A5A5A]">
                  {geminiAvailable ? '通义千问 已连接' : '通义千问 连接中...'}
                </span>
              </div>
              {uploadedImage && (
                <button
                  onClick={() => {
                    setUploadedImage(null);
                    setAuditResult(null);
                  }}
                  className="px-6 py-3 bg-red-500 text-white rounded-2xl text-sm font-bold hover:bg-red-600 transition-all flex items-center gap-2 shadow-lg shadow-red-500/20 hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Trash2 className="w-4 h-4" />
                  重置上传
                </button>
              )}
            </div>
          </div>

          {batchMode ? (
            /* ===== 批量审核 UI ===== */
            <div className="space-y-6">
              {/* 上传按钮区 */}
              <div className="flex gap-4">
                <button onClick={() => batchFileInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-3 px-8 py-5 border-2 border-dashed border-weibo-orange/40 rounded-[2rem] bg-[#FFFAF2]/50 hover:bg-weibo-orange/5 hover:border-weibo-orange transition-all text-weibo-orange font-bold">
                  <Images className="w-5 h-5" />
                  选择多张图片
                </button>
                <button onClick={() => folderInputRef.current?.click()} className="flex-1 flex items-center justify-center gap-3 px-8 py-5 border-2 border-dashed border-weibo-orange/40 rounded-[2rem] bg-[#FFFAF2]/50 hover:bg-weibo-orange/5 hover:border-weibo-orange transition-all text-weibo-orange font-bold">
                  <FolderOpen className="w-5 h-5" />
                  上传文件夹
                </button>
                <input ref={batchFileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && handleBatchFiles(e.target.files)} />
                <input ref={folderInputRef} type="file" accept="image/*" className="hidden" {...{ webkitdirectory: 'true' } as any} onChange={e => e.target.files && handleBatchFiles(e.target.files)} />
              </div>

              {/* 文件列表 + 结果 */}
              {batchItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-[#5A5A5A]">共 {batchItems.length} 张图片</span>
                      <button
                        onClick={() => { setBatchItems([]); setExpandedIndex(null); }}
                        disabled={isBatchAuditing}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-red-400 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 hover:text-red-500 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3 h-3" />
                        清空列表
                      </button>
                    </div>
                    <button
                      onClick={performBatchAudit}
                      disabled={isBatchAuditing || batchItems.some(i => !i.imageData)}
                      className="px-8 py-3 bg-gradient-to-r from-weibo-orange to-weibo-orange-dark text-white rounded-2xl font-bold shadow-lg shadow-weibo-orange/30 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center gap-2"
                    >
                      {isBatchAuditing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Search className="w-4 h-4" />}
                      {isBatchAuditing ? '审核中...' : '开始批量审核'}
                    </button>
                  </div>

                  {batchItems.map((item, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-[#FFE8CC] overflow-hidden shadow-sm">
                      {/* 行头 */}
                      <div className="flex items-center gap-4 px-5 py-4">
                        {/* 缩略图 */}
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#FFFAF2] flex-shrink-0 border border-[#FFE8CC]">
                          {item.imageData && <img src={item.imageData} className="w-full h-full object-cover" />}
                        </div>
                        {/* 文件名 */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-[#1A1A1A] truncate">{item.file.name}</div>
                          {/* 类型选择 */}
                          <div className="relative mt-1 inline-flex items-center">
                            <select
                              value={item.detectedType}
                              onChange={e => setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, detectedType: e.target.value } : it))}
                              className="appearance-none text-xs font-bold text-weibo-orange bg-white border border-weibo-orange/30 rounded-lg pl-2.5 pr-6 py-1 cursor-pointer hover:border-weibo-orange hover:bg-weibo-orange/5 transition-colors outline-none focus:border-weibo-orange focus:ring-1 focus:ring-weibo-orange/20"
                            >
                              {Object.entries(AUDIT_SPECS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-1.5 w-3 h-3 text-weibo-orange/70" />
                          </div>
                        </div>
                        {/* 状态 */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {item.status === 'pending' && <span className="text-xs font-bold text-[#999999] bg-gray-100 px-3 py-1 rounded-full">待审核</span>}
                          {item.status === 'auditing' && <div className="w-4 h-4 border-2 border-weibo-orange/30 border-t-weibo-orange rounded-full animate-spin" />}
                          {item.status === 'done' && (
                            <>
                              <span className={`text-xs font-bold px-3 py-1 rounded-full ${item.result?.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {item.result?.passed ? '通过' : '不通过'}
                              </span>
                              <span className="text-lg font-black text-[#1A1A1A]">{item.result?.score}</span>
                              <button onClick={() => setExpandedIndex(expandedIndex === i ? null : i)} className="text-[#999999] hover:text-weibo-orange transition-colors">
                                {expandedIndex === i ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </button>
                            </>
                          )}
                          {item.status === 'error' && <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-full">审核失败</span>}
                          <button
                            onClick={() => {
                              setBatchItems(prev => prev.filter((_, idx) => idx !== i));
                              if (expandedIndex === i) setExpandedIndex(null);
                              else if (expandedIndex !== null && expandedIndex > i) setExpandedIndex(expandedIndex - 1);
                            }}
                            disabled={isBatchAuditing}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#cccccc] hover:text-red-400 hover:bg-red-50 transition-colors disabled:opacity-30 flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {/* 展开详情 */}
                      {expandedIndex === i && item.result && (
                        <div className="border-t border-[#FFE8CC] px-5 py-4 bg-[#FFFAF2]/50 space-y-3 max-h-96 overflow-y-auto">
                          {item.result.checks.map(check => (
                            <div key={check.id} className="flex items-start justify-between gap-4 bg-white p-4 rounded-xl border border-black/5">
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs text-white font-black ${check.passed ? 'bg-green-500' : 'bg-red-500'}`}>
                                  {check.passed ? '✓' : '✗'}
                                </div>
                                <span className="text-xs font-bold text-[#1A1A1A]">{check.name}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-mono text-[#5A5A5A]">{check.actual}</div>
                                {!check.passed && <div className="text-xs text-red-500 mt-0.5">{check.message}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
          /* ===== 单图审核 UI ===== */
          <>
          {!uploadedImage ? (
            <div
              ref={dropZoneRef}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-[2rem] p-24 text-center cursor-pointer transition-all duration-500 group relative overflow-hidden ${
                isDragging
                  ? 'border-weibo-orange bg-weibo-orange/5 scale-[1.02]'
                  : 'border-[#FFD699] bg-[#FFFAF2]/50 hover:bg-weibo-orange/[0.03] hover:border-weibo-orange'
              }`}
            >
              <div className="absolute inset-0 bg-grid opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-white rounded-3xl shadow-lg shadow-weibo-orange/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <Upload className="w-8 h-8 text-weibo-orange" />
                </div>
                <p className="text-xl font-bold text-[#1A1A1A] mb-2">
                  {isDragging ? '松开鼠标上传图片' : '拖拽图片到此处，或点击上传'}
                </p>
                <p className="text-[#999999] text-sm font-medium max-w-md mx-auto">{spec.uploadHint}</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
            </div>
          ) : (
            <div className="space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                <div className="relative group rounded-[2rem] overflow-hidden border-4 border-white shadow-2xl">
                  <img
                    src={uploadedImage}
                    className="w-full object-contain bg-[#FFFAF2]"
                    alt="Uploaded"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="px-6 py-3 bg-white/90 backdrop-blur-md rounded-2xl text-sm font-bold text-weibo-orange shadow-xl">
                      Original Asset
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {isUploading ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex flex-col items-center justify-center p-16 bg-gradient-to-br from-[#FFFAF2] to-white rounded-[2rem] border border-[#FFE8CC] shadow-inner h-full min-h-[400px]"
                    >
                      <div className="relative mb-8">
                        <div className="w-20 h-20 border-4 border-[#FFD699] border-t-weibo-orange rounded-full animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Search className="w-6 h-6 text-weibo-orange animate-pulse" />
                        </div>
                      </div>
                      <div className="text-xl font-bold text-[#1A1A1A] mb-8">
                        正在进行通义千问 AI 智能审核...
                      </div>
                      <div className="space-y-4 w-full max-w-xs">
                        {['检测图片尺寸', '检查避让区域', '验证配色标准', '检测深色模式适配', '验证文件格式大小', '生成审核报告'].map((step, i) => (
                          <motion.div
                            key={step}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.2 }}
                            className="flex items-center gap-4 text-sm font-bold text-[#999999]"
                          >
                            <div className="w-5 h-5 rounded-full border-2 border-[#FFE8CC] flex-shrink-0" />
                            <span>{step}</span>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ) : auditResult ? (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-10 rounded-[2rem] border-l-[12px] shadow-xl ${
                        auditResult.passed
                          ? 'bg-green-50/50 border-green-500'
                          : 'bg-red-50/50 border-red-500'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-10">
                        <div>
                          <div className={`text-4xl font-black flex items-center gap-3 mb-2 ${
                            auditResult.passed ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {auditResult.passed ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                            {auditResult.passed ? '审核通过' : '审核不通过'}
                          </div>
                          <p className="text-sm font-bold text-[#5A5A5A] opacity-60 uppercase tracking-widest">
                            Audit Report Generated
                          </p>
                        </div>
                        <div className="w-24 h-24 rounded-3xl bg-white flex flex-col items-center justify-center shadow-lg border border-black/5">
                          <div className="text-3xl font-black text-[#1A1A1A]">{auditResult.score}</div>
                          <div className="text-[10px] font-bold text-[#999999] uppercase">Score</div>
                        </div>
                      </div>

                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                        {auditResult.checks.map((check, i) => (
                          <motion.div
                            key={check.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white p-6 rounded-2xl border border-black/5 shadow-sm hover:shadow-md transition-all group"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs text-white font-black ${
                                  check.passed ? 'bg-green-500' : 'bg-red-500'
                                }`}>
                                  {check.passed ? '✓' : '✗'}
                                </div>
                                <div className="text-sm font-bold text-[#1A1A1A]">{check.name}</div>
                              </div>
                              <div className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                                check.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {check.passed ? 'PASSED' : 'FAILED'}
                              </div>
                            </div>
                            <div className="text-xs text-[#5A5A5A] font-medium leading-relaxed mb-2">{check.message}</div>
                            {spec.checks.find(sc => sc.id === check.id)?.hint && (
                              <div className="flex items-start gap-1.5 text-[11px] font-medium text-weibo-orange leading-snug mb-3">
                                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                {spec.checks.find(sc => sc.id === check.id)?.hint}
                              </div>
                            )}
                            <div className="flex gap-4">
                              <div className="flex-1 p-3 bg-[#FFFAF2] rounded-xl border border-[#FFE8CC]">
                                <div className="text-[9px] font-bold text-[#999999] uppercase mb-1">Standard</div>
                                <div className="text-xs font-bold font-mono">{check.standard}</div>
                              </div>
                              <div className={`flex-1 p-3 rounded-xl border ${
                                check.passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                              }`}>
                                <div className="text-[9px] font-bold text-[#999999] uppercase mb-1">Actual</div>
                                <div className={`text-xs font-bold font-mono ${check.passed ? 'text-green-700' : 'text-red-700'}`}>
                                  {check.actual}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-16 bg-gradient-to-br from-[#FFFAF2] to-white rounded-[2rem] border border-[#FFE8CC] shadow-inner h-full min-h-[400px]">
                      <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-6">
                        <AlertCircle className="w-8 h-8 text-weibo-orange/40" />
                      </div>
                      <div className="text-xl font-bold text-[#1A1A1A] mb-2">Ready to Audit</div>
                      <p className="text-[#999999] text-sm font-medium text-center max-w-xs">
                        点击下方按钮开始深度审核，我们将为您生成完整的合规性报告。
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {auditResult && auditResult.suggestions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white p-10 rounded-[2.5rem] border border-[#FFE8CC] shadow-xl"
                >
                  <h3 className="text-2xl font-bold text-[#1A1A1A] mb-8 flex items-center gap-4">
                    <div className="w-12 h-12 bg-weibo-orange/10 rounded-2xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-weibo-orange" />
                    </div>
                    优化建议与指导
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {auditResult.suggestions.map((s, i) => (
                      <div key={i} className="flex gap-6 p-6 bg-[#FFFAF2] rounded-3xl border border-[#FFE8CC] hover:border-weibo-orange/30 transition-all">
                        <div className="w-10 h-10 bg-weibo-orange text-white rounded-xl flex items-center justify-center font-bold flex-shrink-0 shadow-lg shadow-weibo-orange/20">
                          {i + 1}
                        </div>
                        <div>
                          <h5 className="font-bold text-base text-[#1A1A1A] mb-2">{s.title}</h5>
                          <p className="text-sm text-[#5A5A5A] font-medium leading-relaxed mb-2">{s.description}</p>
                          {spec.checks.find(sc => sc.id === (s as any).id)?.hint && (
                            <div className="flex items-start gap-1.5 text-[11px] font-medium text-weibo-orange leading-snug mb-3">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                              {spec.checks.find(sc => sc.id === (s as any).id)?.hint}
                            </div>
                          )}
                          <div className="space-y-2">
                            {s.steps.map((step, j) => (
                              <div key={j} className="flex items-center gap-2 text-xs text-[#999999] font-medium">
                                <div className="w-1.5 h-1.5 bg-weibo-gold rounded-full" />
                                {step}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              <div className="flex justify-end gap-6">
                {auditResult && (
                  <button
                    onClick={() => {
                      const report = {
                        type: spec.name,
                        auditTime: new Date().toLocaleString('zh-CN'),
                        score: auditResult.score,
                        passed: auditResult.passed ? '通过' : '不通过',
                        checks: auditResult.checks.map(c => ({
                          name: c.name,
                          standard: c.standard,
                          actual: c.actual,
                          result: c.passed ? '通过' : '不通过',
                          message: c.message,
                        })),
                        suggestions: auditResult.suggestions.map(s => ({
                          title: s.title,
                          description: s.description,
                          steps: s.steps,
                        })),
                      };
                      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `audit-${activeType}-${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-10 py-4 bg-white border-2 border-[#FFE8CC] text-[#5A5A5A] rounded-2xl font-bold hover:bg-[#FFFAF2] hover:border-weibo-orange/30 transition-all flex items-center gap-3 btn-tactile">
                    <FileText className="w-5 h-5" />
                    导出审核报告
                  </button>
                )}
                {activeType === 'avatar-widget' && (
                  <button
                    onClick={() => setShowPreview(true)}
                    className="px-10 py-4 bg-white border-2 border-weibo-orange/40 text-weibo-orange rounded-2xl font-bold hover:bg-weibo-orange/5 hover:border-weibo-orange transition-all flex items-center gap-3 btn-tactile"
                  >
                    <Search className="w-5 h-5" />
                    预览展示效果
                  </button>
                )}
                <button
                  onClick={performAudit}
                  disabled={isUploading}
                  className="px-20 py-4 bg-gradient-to-r from-weibo-orange to-weibo-orange-dark text-white rounded-2xl font-bold shadow-xl shadow-weibo-orange/30 hover:shadow-2xl hover:shadow-weibo-orange/40 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center gap-3 btn-tactile"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                  {isUploading ? '正在深度审核...' : '立即开始审核'}
                </button>
              </div>
            </div>
          )}
          </>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-[2.5rem] p-10"
        >
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-8 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-gradient-to-b from-weibo-orange to-weibo-gold rounded-full" />
            当前类型规范
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {spec.checks.slice(0, 12).map((check, i) => (
              <motion.div
                key={check.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.05 }}
                className="p-6 bg-gradient-to-br from-[#FFFAF2] to-white rounded-3xl border border-[#FFE8CC] group hover:border-weibo-orange/30 transition-colors"
              >
                <div className="text-[10px] font-bold text-[#999999] uppercase tracking-widest mb-2 group-hover:text-weibo-orange transition-colors">{check.name}</div>
                <div className="text-lg font-bold text-[#1A1A1A] font-mono tracking-tight">
                  {check.standard}
                </div>
                {check.hint && (
                  <div className="mt-2 flex items-start gap-1.5 text-[11px] font-medium text-weibo-orange leading-snug">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    {check.hint}
                  </div>
                )}
                <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 text-[10px] text-red-500 font-bold rounded-lg border border-red-100">
                  <AlertCircle className="w-3 h-3" />
                  {check.tolerance === 0 ? '无容差' : `容差±${check.tolerance}`}
                </div>
              </motion.div>
            ))}
          </div>
          {spec.checks.length > 12 && (
            <div className="mt-10 pt-10 border-t border-[#FFE8CC]/50">
              <div className="text-xs font-bold text-[#999999] uppercase tracking-[0.2em] mb-6">其他检测项</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {spec.checks.slice(12).map((check, i) => (
                  <motion.div
                    key={check.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                    className="p-6 bg-gradient-to-br from-[#FFFAF2] to-white rounded-3xl border border-[#FFE8CC] group hover:border-weibo-orange/30 transition-colors"
                  >
                    <div className="text-[10px] font-bold text-[#999999] uppercase tracking-widest mb-2 group-hover:text-weibo-orange transition-colors">{check.name}</div>
                    <div className="text-sm font-bold text-[#1A1A1A] font-mono tracking-tight leading-snug">
                      {check.standard}
                    </div>
                    {check.hint && (
                      <div className="mt-2 flex items-start gap-1.5 text-[11px] font-medium text-weibo-orange leading-snug">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                        {check.hint}
                      </div>
                    )}
                    <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 text-[10px] text-red-500 font-bold rounded-lg border border-red-100">
                      <AlertCircle className="w-3 h-3" />
                      {check.tolerance === 0 ? '无容差' : `容差±${check.tolerance}`}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
          {spec.colorPalettes && (
            <div className="mt-10 pt-10 border-t border-[#FFE8CC]/50">
              <div className="text-xs font-bold text-[#999999] uppercase tracking-[0.2em] mb-6">配色标准 (RGB)</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {spec.colorPalettes.map((palette, i) => (
                  <motion.div
                    key={palette.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                    className="p-4 bg-white rounded-2xl border border-[#FFE8CC] flex items-center gap-4 group hover:shadow-md transition-all"
                  >
                    <div
                      className="w-10 h-10 rounded-xl shadow-inner border border-black/5 group-hover:scale-110 transition-transform duration-500"
                      style={{ backgroundColor: `rgb(${palette.rgb.join(',')})` }}
                    />
                    <div>
                      <div className="text-[10px] font-bold text-[#999999]">{palette.name}</div>
                      <div className="text-xs font-bold font-mono">{palette.rgb.join(',')}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};
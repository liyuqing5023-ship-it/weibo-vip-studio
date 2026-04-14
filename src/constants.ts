import { AuditSpec } from './types';

/**
 * 微博会员装扮设计规范审核配置
 * 严格按照微博UDC会员设计中心规范执行
 * 设计师：沙莎 | 邮箱：shasha19@staff.weibo.com
 */

export const AUDIT_SPECS: Record<string, AuditSpec> = {
  'avatar-widget': {
    name: '头像挂件',
    uploadHint: '上传尺寸：250×268px，文件大小：<350KB，格式：GIF/PNG，分辨率：72px',
    checks: [
      // 尺寸检测（无容差）
      { id: 'canvas-width', name: '画布宽度', standard: '250px', tolerance: 0 },
      { id: 'canvas-height', name: '画布高度', standard: '268px', tolerance: 0 },
      { id: 'resolution', name: '分辨率', standard: '72px', tolerance: 0 },
      { id: 'file-size', name: '文件大小', standard: '<350KB', tolerance: 0 },
      // 透明底检测
      { id: 'transparent-bg', name: '背景透明度', standard: '四角必须透明（alpha=0）', tolerance: 0 },
      // 区域检测
      { id: 'avatar-occlusion', name: '用户头像遮挡率', standard: '≤20% (228×228px居中区域)', tolerance: 0, hint: '规范根据挂件风格、及动画呈现方式灵活判断，请设计师自行判断；' },
      { id: 'avoid-zone', name: '左右避让区域', standard: '向内4px无任何元素', tolerance: 0, hint: '规范根据挂件风格、及动画呈现方式灵活判断，请设计师自行判断；' },
      { id: 'v-zone', name: 'V标区域', standard: '右下角60×60px无重要元素', tolerance: 0, hint: '规范根据挂件风格、及动画呈现方式灵活判断，请设计师自行判断；' },
      // 元素位置检测
      { id: 'main-element-position', name: '主元素位置', standard: '上方60px高度范围内', tolerance: 0, hint: '规范根据挂件风格、及动画呈现方式灵活判断，请设计师自行判断；' }
    ],
    animationChecks: [
      { id: 'duration', name: '动画时长', standard: '1-5秒', tolerance: 0 },
      { id: 'frame-rate', name: '帧速率', standard: '30fps', tolerance: 0 },
      { id: 'output-format', name: '输出格式', standard: 'GIF/PNG', tolerance: 0 }
    ]
  },
  'comment-bubble': {
    name: '评论气泡',
    uploadHint: '上传尺寸：210×90px，避让区域：向内3px，格式：PNG',
    checks: [
      // 尺寸检测（无容差）
      { id: 'canvas-width', name: '画布宽度', standard: '210px', tolerance: 0 },
      { id: 'canvas-height', name: '画布高度', standard: '90px', tolerance: 0 },
      // 设计区域检测
      { id: 'avoid-zone', name: '四周避让区域', standard: '向内3px无任何元素', tolerance: 0 },
      { id: 'main-element-zone', name: '主元素区', standard: '①根据设计确定范围内', tolerance: 0 },
      { id: 'aux-element-zone', name: '辅助元素区', standard: '②根据设计确定范围内', tolerance: 0 },
      { id: 'red-avoid-zone', name: '红色避让区', standard: '③固定位置无元素', tolerance: 0 },
      { id: 'color-check', name: '气泡底色配色', standard: 'NO.1-5标准色值(容差≤3)', tolerance: 3 },
      { id: 'gradient-direction', name: '渐变方向', standard: '从左至右', tolerance: 0 },
      { id: 'gradient-alpha', name: '渐变透明度', standard: '0—10', tolerance: 0 },
      { id: 'text-occlusion', name: '文字遮挡检测', standard: '不遮挡评论文字、二级评论灰色框', tolerance: 0 },
      { id: 'design-simplicity', name: '设计简洁度', standard: '元素不过于复杂', tolerance: 0 }
    ],
    colorPalettes: [
      { name: 'NO.1', rgb: [255, 143, 86], range: { r: [252, 258], g: [140, 146], b: [83, 89] } },
      { name: 'NO.2', rgb: [254, 173, 58], range: { r: [251, 255], g: [170, 176], b: [55, 61] } },
      { name: 'NO.3', rgb: [222, 200, 76], range: { r: [219, 225], g: [197, 203], b: [73, 79] } },
      { name: 'NO.4', rgb: [165, 93, 171], range: { r: [162, 168], g: [90, 96], b: [168, 174] } },
      { name: 'NO.5', rgb: [208, 70, 102], range: { r: [205, 211], g: [67, 73], b: [99, 105] } }
    ]
  },
  'chat-bubble': {
    name: '聊天气泡（私聊/群聊）',
    uploadHint: '上传尺寸：174×174px（iOS）/ 176×176px（安卓），格式：PNG透明底',
    checks: [
      // 尺寸检测（无容差）
      { id: 'canvas-size-ios', name: 'iOS画布尺寸', standard: '174×174px', tolerance: 0 },
      { id: 'canvas-size-android', name: '安卓画布尺寸', standard: '176×176px', tolerance: 0 },
      { id: 'bubble-rect', name: '气泡矩形', standard: '118×120px', tolerance: 0 },
      // 气泡挂件区域检测
      { id: 'top-widget-left', name: '上挂件（左）', standard: '50×34px内，超出即不合格', tolerance: 0 },
      { id: 'top-widget-right', name: '上挂件（右）', standard: '70×42px内，超出即不合格', tolerance: 0 },
      { id: 'bottom-widget', name: '下挂件', standard: '76×73px内且必须在右侧', tolerance: 0 },
      // 气泡描边检测
      { id: 'stroke-width-base', name: '基础描边宽度', standard: '1.5px±0.1px', tolerance: 0.1 },
      { id: 'stroke-width-max', name: '最大描边宽度', standard: '≤4px', tolerance: 0 },
      { id: 'stroke-direction', name: '描边方向', standard: '向内', tolerance: 0 },
      // iOS切图检测
      { id: 'ios-format', name: 'iOS输出格式', standard: 'PNG透明底', tolerance: 0 },
      { id: 'ios-dark-mode', name: 'iOS暗黑模式', standard: '适配暗黑背景', tolerance: 0 },
      // 安卓切图检测
      { id: 'android-format', name: '安卓输出格式', standard: 'PNG透明底', tolerance: 0 },
      // 点9图标记检测
      { id: 'nine-patch-top', name: '点9图-上标记', standard: '长1-4px，高1px，颜色#000000', tolerance: 0 },
      { id: 'nine-patch-left', name: '点9图-左标记', standard: '高1-4px，宽1px，颜色#000000', tolerance: 0 },
      { id: 'nine-patch-right', name: '点9图-右标记', standard: '高=气泡矩形高，宽1px，颜色#000000', tolerance: 0 },
      { id: 'nine-patch-bottom', name: '点9图-下标记', standard: '长=气泡矩形长，高1px，颜色#000000', tolerance: 0 },
      // 文字颜色对比度检测（深色模式）
      { id: 'contrast-ratio', name: '文字与背景对比度', standard: '≥4.5:1 (WCAG AA标准)', tolerance: 0 },
      { id: 'link-color', name: '链接文字颜色', standard: '非灰色(RGB≥100或≤155)', tolerance: 0 },
      { id: 'link-difference', name: '链接与正文色差', standard: '≥30', tolerance: 0 }
    ]
  },
  'card-bg': {
    name: '卡片背景',
    uploadHint: '上传尺寸：441×120px，格式：PNG/JPG',
    checks: [
      // 尺寸检测（无容差）
      { id: 'canvas-size', name: '画布尺寸', standard: '441×120px', tolerance: 0 },
      // 设计区域检测
      { id: 'main-element-zone', name: '主元素区', standard: '①250×100px内，超出即不合格', tolerance: 0 },
      { id: 'transition-zone', name: '过渡区域', standard: '②300×120px内，辅助元素可在区域内', tolerance: 0 },
      { id: 'avoid-zone', name: '避让区域', standard: '③141×120px无任何元素', tolerance: 0 },
      // 深色模式适配检测
      { id: 'dark-mode-visibility', name: '深色模式可见性', standard: '#1E1E1E背景下元素可见', tolerance: 0 },
      { id: 'dark-mode-gradient', name: '背景渐变完整性', standard: '渐变过渡完整', tolerance: 0 },
      { id: 'edge-clipping', name: '边缘裁切检测', standard: '无边缘被裁切', tolerance: 0 }
    ]
  },
  'number-card': {
    name: '编号卡背',
    uploadHint: '上传尺寸：441×120px，格式：PNG/JPG',
    checks: [
      // 尺寸检测（无容差）
      { id: 'canvas-size', name: '画布尺寸', standard: '441×120px', tolerance: 0 },
      // 设计区域检测
      { id: 'main-element-zone', name: '主元素区', standard: '①205×110px内，超出即不合格', tolerance: 0 },
      { id: 'total-design-zone', name: '总设计区', standard: '②300×120px内，所有设计内容在此区域', tolerance: 0 },
      { id: 'avoid-zone', name: '避让区域', standard: '④141×120px无任何元素', tolerance: 0 },
      // 编号区域检测
      { id: 'number-zone', name: '编号区域', standard: '③固定位置，避让且颜色不可过深', tolerance: 0 },
      { id: 'number-font', name: '编号字体', standard: '汉仪旗黑，匹配度≥90%', tolerance: 0 },
      { id: 'number-font-size', name: '编号字号', standard: '31.06点，高度23px，匹配度≥95%', tolerance: 0 },
      { id: 'number-color', name: '编号颜色', standard: '#935000 (RGB:147,80,0)，容差≤3', tolerance: 3 },
      { id: 'number-x', name: '编号X坐标', standard: '152px，容差≤2px', tolerance: 2 },
      { id: 'number-y', name: '编号Y坐标', standard: '84px，容差≤2px', tolerance: 2 }
    ]
  },
  'badge': {
    name: '铭牌',
    uploadHint: 'SVIP1-7: 149×54px, SVIP8-9/VVIP1-2: 162×54px, SVIP10/VVIP3-5: 172×54px',
    checks: [
      // 尺寸检测（无容差）
      { id: 'size-1x-svip1-7', name: 'SVIP1-7尺寸(1x)', standard: '149×54px', tolerance: 0 },
      { id: 'size-2x-svip1-7', name: 'SVIP1-7尺寸(2x)', standard: '298×108px', tolerance: 0 },
      { id: 'size-6x-svip1-7', name: 'SVIP1-7尺寸(6x)', standard: '894×324px', tolerance: 0 },
      { id: 'size-1x-svip8-9', name: 'SVIP8-9/VVIP1-2尺寸(1x)', standard: '162×54px', tolerance: 0 },
      { id: 'size-2x-svip8-9', name: 'SVIP8-9/VVIP1-2尺寸(2x)', standard: '324×108px', tolerance: 0 },
      { id: 'size-6x-svip8-9', name: 'SVIP8-9/VVIP1-2尺寸(6x)', standard: '972×324px', tolerance: 0 },
      { id: 'size-1x-svip10', name: 'SVIP10/VVIP3-5尺寸(1x)', standard: '172×54px', tolerance: 0 },
      { id: 'size-2x-svip10', name: 'SVIP10/VVIP3-5尺寸(2x)', standard: '344×108px', tolerance: 0 },
      { id: 'size-6x-svip10', name: 'SVIP10/VVIP3-5尺寸(6x)', standard: '1032×324px', tolerance: 0 },
      // Feed页铭牌延展检测
      { id: 'feed-extend-size', name: 'Feed页延展尺寸', standard: '116×42px', tolerance: 0 },
      { id: 'feed-extend-copy', name: 'Feed页文案', standard: '缩写形式，检测正确性', tolerance: 0 },
      { id: 'feed-extend-format', name: 'Feed页输出格式', standard: 'PNG，无动画', tolerance: 0 }
    ]
  },
  'like-animation': {
    name: '被赞动效',
    uploadHint: '静态：600×600px，感谢语底板：206×84px，格式：PNG，商城封面：510×264px',
    checks: [
      // 静态视觉检测
      { id: 'canvas-size', name: '画面尺寸', standard: '600×600px', tolerance: 0 },
      { id: 'main-element-zone', name: '主体元素区域', standard: '360×360px内', tolerance: 0 },
      { id: 'bottom-reserved', name: '底部预留区', standard: '600×108px无设计元素', tolerance: 0 },
      // 感谢语底板检测
      { id: 'bottom-plate-size', name: '感谢语底板尺寸', standard: '206×84px', tolerance: 0 },
      { id: 'bottom-plate-gradient', name: '感谢语底板渐变', standard: '左至右渐变方向正确', tolerance: 0 },
      { id: 'bottom-plate-format', name: '感谢语底板格式', standard: 'PNG', tolerance: 0 },
      // 动画检测
      { id: 'animation-duration', name: '动画时长', standard: '2-3秒', tolerance: 0 },
      { id: 'frame-rate', name: '帧速率', standard: '24fps', tolerance: 0 },
      { id: 'fade-in', name: '淡入动画', standard: '第6帧结束(不透明度变化)', tolerance: 0 },
      { id: 'fade-out', name: '淡出动画', standard: '倒数第3帧开始(不透明度变化)', tolerance: 0 },
      // 文件检测
      { id: 'mall-cover-size', name: '商城封面尺寸', standard: '510×264px', tolerance: 0 },
      { id: 'mall-cover-size-limit', name: '商城封面大小', standard: '≤300KB', tolerance: 0 },
      { id: 'record-cover-size', name: '使用记录封面尺寸', standard: '228×228px', tolerance: 0 },
      { id: 'record-cover-size-limit', name: '使用记录封面大小', standard: '≤300KB', tolerance: 0 },
      { id: 'mall-preview-size', name: '商城预览GIF尺寸', standard: '600×600px', tolerance: 0 },
      { id: 'mall-preview-size-limit', name: '商城预览GIF大小', standard: '≤300KB', tolerance: 0 },
      { id: 'dual-channel-mp4', name: '双通道MP4尺寸', standard: '1200×600px', tolerance: 0 }
    ]
  },
  'thumb-up': {
    name: '评论大拇指点赞',
    uploadHint: 'iOS：540×540px（9倍图），安卓：432×432px（3倍图）',
    checks: [
      // iOS尺寸检测（9倍图制作）
      { id: 'ios-canvas', name: 'iOS画布尺寸', standard: '540×540px (9倍图)', tolerance: 0 },
      { id: 'ios-main-zone', name: 'iOS主体区域', standard: '390×459px内', tolerance: 0 },
      // iOS切图检测
      { id: 'ios-cut1', name: 'iOS切图尺寸1', standard: '180×180px', tolerance: 0 },
      { id: 'ios-cut2', name: 'iOS切图尺寸2', standard: '167×167px', tolerance: 0 },
      { id: 'ios-cut3', name: 'iOS切图尺寸3', standard: '152×152px', tolerance: 0 },
      { id: 'ios-cut4', name: 'iOS切图尺寸4', standard: '120×120px', tolerance: 0 },
      // 安卓尺寸检测（3倍图制作）
      { id: 'android-canvas', name: '安卓画布尺寸', standard: '432×432px (3倍图)', tolerance: 0 },
      { id: 'android-main-zone', name: '安卓主体区域', standard: '300×348px内', tolerance: 0 },
      // 安卓切图检测
      { id: 'android-cut', name: '安卓切图尺寸', standard: '144×144px', tolerance: 0 },
      // 命名规则检测
      { id: 'naming-prefix', name: '命名前缀', standard: '必须为"wb_"', tolerance: 0 },
      { id: 'naming-separator', name: '命名分隔符', standard: '必须使用"_"', tolerance: 0 },
      { id: 'naming-forbidden', name: '命名禁止项', standard: '禁止空格和标点符号', tolerance: 0 },
      // 设计检测
      { id: 'text-area-ratio', name: '文字面积占比', standard: '≤5%', tolerance: 0 },
      { id: 'color-comfort', name: '配色舒适度', standard: '检测配色舒适度', tolerance: 0 }
    ]
  },
  'like-privilege': {
    name: '喜欢特权',
    uploadHint: '上传尺寸：900×222px，格式：PNG/JPG',
    checks: [
      // 尺寸检测（无容差）
      { id: 'canvas-size', name: '画布尺寸', standard: '900×222px', tolerance: 0 },
      // 设计区域检测
      { id: 'main-bg-zone', name: '一级背景/主元素区', standard: '①243×132px内，主要元素不超出', tolerance: 0 },
      { id: 'secondary-bg-zone', name: '二级背景/过渡区域', standard: '②300×120px内，辅助元素可在区域内', tolerance: 0 },
      { id: 'tertiary-bg', name: '三级背景区', standard: '③900×222px，渐变45°，alpha 5%-0%', tolerance: 0 },
      { id: 'safe-distance', name: '安全距离', standard: '④右侧42PX，元素需预留', tolerance: 0 },
      // 深色模式适配检测
      { id: 'dark-mode-visibility', name: '深色模式可见性', standard: '#1E1E1E背景下元素可见', tolerance: 0 },
      { id: 'contrast-ratio', name: '颜色对比度', standard: '≥4.5:1', tolerance: 0 }
    ]
  },
  'skin-set': {
    name: '皮肤套装',
    uploadHint: '动态视频：1080×608px MP4≤2M，静态：1000×1000px JPG≤500KB',
    checks: [
      // 皮肤封面检测 - 动态视频
      { id: 'cover-video-size', name: '皮肤封面-动态视频尺寸', standard: '1080×608px', tolerance: 0 },
      { id: 'cover-video-format', name: '皮肤封面-动态视频格式', standard: 'MP4', tolerance: 0 },
      { id: 'cover-video-size-limit', name: '皮肤封面-动态视频大小', standard: '≤2MB', tolerance: 0 },
      // 皮肤封面检测 - 静态图片
      { id: 'cover-image-size', name: '皮肤封面-静态图片尺寸', standard: '1000×1000px', tolerance: 0 },
      { id: 'cover-image-format', name: '皮肤封面-静态图片格式', standard: 'JPG', tolerance: 0 },
      { id: 'cover-image-size-limit', name: '皮肤封面-静态图片大小', standard: '≤500KB', tolerance: 0 },
      // 遮挡区域检测
      { id: 'video-occlusion-bottom', name: '动态视频-下方遮挡', standard: '1080×21px无元素', tolerance: 0 },
      { id: 'video-occlusion-avatar', name: '动态视频-头像出框', standard: '198×90px无元素', tolerance: 0 },
      { id: 'image-occlusion-top', name: '静态图片-上方遮挡', standard: '1000×218px无元素', tolerance: 0 },
      { id: 'image-occlusion-bottom', name: '静态图片-下方遮挡', standard: '1000×218px无元素', tolerance: 0 },
      { id: 'notch-zone', name: '刘海屏区域', standard: '根据机型检测重要元素避让', tolerance: 0 },
      // 皮肤海报检测
      { id: 'poster-size', name: '皮肤海报尺寸', standard: '900×1900px', tolerance: 0 },
      { id: 'poster-dynamic-format', name: '海报动态格式', standard: 'MP4≤3M', tolerance: 0 },
      { id: 'poster-static-format', name: '海报静态格式', standard: 'JPG≤700KB', tolerance: 0 },
      { id: 'poster-bottom-occlusion', name: '海报底部遮挡', standard: '900×257px无元素', tolerance: 0 },
      { id: 'poster-main-title', name: '海报主标题', standard: '≤16字符(8汉字)', tolerance: 0 },
      { id: 'poster-sub-title', name: '海报副标题', standard: '≤28字符(14汉字)', tolerance: 0 },
      // 头部资料背景检测 - 渐变背景图
      { id: 'header-bg-size', name: '头部资料背景尺寸', standard: '1300×510px', tolerance: 0 },
      { id: 'header-bg-format', name: '头部资料背景格式', standard: 'PNG', tolerance: 0 },
      { id: 'header-bg-size-limit', name: '头部资料背景大小', standard: '≤500KB', tolerance: 0 },
      { id: 'header-bg-color-light', name: '底部颜色-浅色', standard: '#FFFFFF (RGB:255,255,255)，容差≤3', tolerance: 3 },
      { id: 'header-bg-color-dark', name: '底部颜色-深色', standard: '#1E1E1E (RGB:30,30,30)，容差≤3', tolerance: 3 },
      { id: 'header-bg-watermark', name: '水印设计区', standard: '240×240px，检测元素水印化处理', tolerance: 0 },
      // 头部资料背景检测 - 出框元素
      { id: 'out-frame-size', name: '出框元素尺寸', standard: '630×120px', tolerance: 0 },
      { id: 'out-frame-format', name: '出框元素格式', standard: 'PNG/MP4双通道', tolerance: 0 },
      { id: 'out-frame-size-limit', name: '出框元素大小(PNG)', standard: '≤50KB', tolerance: 0 },
      // Tab选中态检测
      { id: 'tab-icon-size', name: 'Tab选中态icon尺寸', standard: '72×72px', tolerance: 0 },
      { id: 'tab-slider-size', name: 'Tab选中态滑动条尺寸', standard: '138×30px', tolerance: 0 },
      { id: 'tab-file-size-limit', name: 'Tab选中态文件大小', standard: '≤20KB', tolerance: 0 },
      // 底部导航检测 - 底导icon（11个）
      { id: 'bottom-nav-icon-size', name: '底导icon输出尺寸', standard: '120×90px (11个)', tolerance: 0 },
      { id: 'bottom-nav-icon-format', name: '底导icon输出格式', standard: 'PNG', tolerance: 0 },
      { id: 'bottom-nav-icon-size-limit', name: '底导icon输出大小', standard: '≤15KB', tolerance: 0 },
      { id: 'bottom-nav-icon-avoid', name: '底导icon避让区域', standard: '上下各2px，检测元素避让', tolerance: 0 },
      // 底部导航检测 - 关注按钮
      { id: 'follow-btn-size', name: '关注按钮输出尺寸', standard: '270×120px', tolerance: 0 },
      { id: 'follow-btn-format', name: '关注按钮输出格式', standard: 'PNG点9图/PNG', tolerance: 0 },
      { id: 'follow-btn-size-limit', name: '关注按钮输出大小', standard: '≤15KB', tolerance: 0 },
      { id: 'follow-btn-main-zone', name: '关注按钮主元素区', standard: '两侧84×120px，元素不超出', tolerance: 0 },
      // 底部导航检测 - 底部导航背景
      { id: 'bottom-nav-bg-size', name: '底部导航背景输出尺寸', standard: '1242×303px', tolerance: 0 },
      { id: 'bottom-nav-bg-format', name: '底部导航背景输出格式', standard: 'PNG', tolerance: 0 },
      { id: 'bottom-nav-bg-size-limit', name: '底部导航背景输出大小', standard: '≤150KB', tolerance: 0 },
      { id: 'bottom-nav-bg-core-zone', name: '底部导航背景核心设计区', standard: '1242×186px，核心元素不超出', tolerance: 0 }
    ]
  }
};

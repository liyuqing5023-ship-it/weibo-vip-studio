/**
 * 微博会员装扮审核平台类型定义
 * 严格按照微博UDC会员设计中心规范
 * 设计师：沙莎 | 邮箱：shasha19@staff.weibo.com
 */

export type PageType = 'audit' | 'generate' | 'extend' | 'history' | 'spec';

/**
 * 审核检查项定义
 */
export interface AuditCheck {
  /** 检查项唯一标识 */
  id: string;
  /** 检查项名称 */
  name: string;
  /** 标准值 */
  standard: string;
  /** 容差值，0表示无容差 */
  tolerance: number;
  /** 灵活判断提示（橙色展示） */
  hint?: string;
}

/**
 * 审核规范定义
 */
export interface AuditSpec {
  /** 装扮类型名称 */
  name: string;
  /** 上传提示信息 */
  uploadHint: string;
  /** 检查项列表 */
  checks: AuditCheck[];
  /** 动画检查项（可选） */
  animationChecks?: AuditCheck[];
  /** 配色方案（可选） */
  colorPalettes?: {
    /** 配色名称 */
    name: string;
    /** RGB颜色值 */
    rgb: [number, number, number];
    /** 允许的颜色范围 */
    range: {
      r: [number, number];
      g: [number, number];
      b: [number, number];
    };
  }[];
}

/**
 * 审核结果定义
 */
export interface AuditResult {
  /** 是否通过审核 */
  passed: boolean;
  /** 各检查项详细结果 */
  checks: {
    /** 检查项ID */
    id: string;
    /** 检查项名称 */
    name: string;
    /** 标准值 */
    standard: string;
    /** 实际值 */
    actual: string;
    /** 是否通过 */
    passed: boolean;
    /** 结果消息 */
    message: string;
  }[];
  /** 得分（0-100） */
  score: number;
  /** 总检查项数 */
  totalChecks: number;
  /** 优化建议 */
  suggestions: {
    /** 建议标题 */
    title: string;
    /** 建议描述 */
    description: string;
    /** 修改步骤 */
    steps: string[];
  }[];
  /** 标注信息 */
  annotations: {
    /** 标注类型 */
    type: 'error' | 'warning';
    /** 标注标签 */
    label: string;
    /** 标注位置 */
    position: 'center';
  }[];
}

/**
 * 历史记录项定义
 */
export interface HistoryItem {
  /** 唯一标识 */
  id: string;
  /** 标题 */
  title: string;
  /** 时间戳 */
  timestamp: string;
  /** 风格 */
  style: string;
  /** 尺寸 */
  size: string;
  /** 图片URL */
  imageUrl: string;
  /** 类型 */
  type: 'generate' | 'widget' | 'extend';
}

/**
 * 审核报告导出格式
 */
export interface AuditReport {
  /** 审核ID */
  auditId: string;
  /** 装扮类型 */
  decorationType: string;
  /** 上传时间 */
  uploadTime: string;
  /** 文件名 */
  fileName: string;
  /** 尺寸检查结果 */
  sizeCheck: boolean;
  /** 避让区域检查结果 */
  avoidZoneCheck: boolean;
  /** 配色检查结果 */
  colorCheck: boolean;
  /** 文件大小检查结果 */
  fileSizeCheck: boolean;
  /** 文件格式检查结果 */
  fileFormatCheck: boolean;
  /** 点9图标记检查结果 */
  ninePatchCheck: boolean;
  /** 深色模式适配结果 */
  darkModeCheck: boolean;
  /** 最终审核结果 */
  result: '通过' | '不通过';
  /** 错误详情 */
  errorDetails: string;
  /** 标注图片路径 */
  annotatedImagePath: string;
}

/**
 * API响应格式
 */
export interface AuditApiResponse {
  /** 审核ID */
  auditId: string;
  /** 审核结果 */
  result: '通过' | '不通过';
  /** 详细检查结果 */
  checks: Record<string, {
    /** 状态 */
    status: '合格' | '不合格';
    /** 详情 */
    details: string;
  }>;
  /** 标注图片URL */
  annotatedImage: string;
  /** 审核报告URL */
  reportUrl: string;
}

/**
 * 批量审核条目
 */
export interface BatchItem {
  file: File;
  imageData: string;
  detectedType: string;
  status: 'pending' | 'auditing' | 'done' | 'error';
  result?: AuditResult;
}

/**
 * 批量审核API响应格式
 */
export interface BatchAuditApiResponse {
  /** 批次ID */
  batchId: string;
  /** 审核结果数组 */
  results: AuditApiResponse[];
  /** Excel报告URL */
  reportUrl: string;
}

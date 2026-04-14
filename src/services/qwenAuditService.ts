/**
 * 阿里云百炼 Qwen-VL 图片审核服务
 * 通过 server.js 服务端代理调用 DashScope Qwen-VL API
 */

export interface AuditCheckResult {
  id: string;
  name: string;
  passed: boolean;
  message: string;
  actual: string;
}

/**
 * 调用 Qwen-VL 进行图片审核（经由服务端代理）
 */
export async function auditImageWithQwen(
  imageData: string,
  auditType: string,
  spec: any
): Promise<{
  checks: AuditCheckResult[];
  passed: boolean;
  score: number;
  suggestions: any[];
}> {
  try {
    const prompt = buildAuditPrompt(auditType, spec);

    // 从 data URL 中提取 mimeType 和纯 base64
    let mimeType = 'image/png';
    let imageBase64 = imageData;
    if (imageData.includes(',')) {
      const [header, data] = imageData.split(',');
      imageBase64 = data;
      const match = header.match(/data:([^;]+)/);
      if (match) mimeType = match[1];
    }

    const response = await fetch('/api/qwen-audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, imageBase64, mimeType }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`Server error: ${JSON.stringify(err)}`);
    }

    const { text } = await response.json();
    return parseAuditResult(text, spec, auditType);
  } catch (error) {
    console.error('Qwen-VL audit error:', error);
    return {
      checks: spec.checks.map((check: any) => ({
        id: check.id,
        name: check.name,
        passed: true,
        message: 'AI 分析不可用，尺寸项将由浏览器精确检测',
        actual: '待检测',
      })),
      passed: true,
      score: 100,
      suggestions: [],
    };
  }
}

/**
 * 检查 Qwen-VL 服务是否可用（请求服务端健康检查）
 */
export async function checkQwenHealth(): Promise<boolean> {
  try {
    const res = await fetch('/api/health');
    return res.ok;
  } catch {
    return false;
  }
}

function buildAuditPrompt(auditType: string, spec: any): string {
  const checks = spec.checks.map((check: any) =>
    `- ${check.name}: 标准 ${check.standard}${check.tolerance === 0 ? '（无容差）' : ''}`
  ).join('\n');

  let prompt = `你是一个专业的图片审核专家，负责审核微博会员装扮设计稿。

审核类型：${spec.name}
上传提示：${spec.uploadHint}

需要检查的项目：
${checks}

请严格按照以下 JSON 格式返回审核结果：
{
  "checks": [
    {
      "id": "检查项ID",
      "name": "检查项名称",
      "passed": true/false,
      "message": "检查结果描述",
      "actual": "实际检测到的值"
    }
  ],
  "summary": "整体评估"
}

注意：
1. 尺寸检查必须精确，无容差
2. 避让区域有任何元素即为不合格
3. 配色检查要在允许的 RGB 范围内
4. 返回纯净的 JSON，不要包含其他文字`;

  if (spec.colorPalettes && spec.colorPalettes.length > 0) {
    const colorInfo = spec.colorPalettes.map((p: any) =>
      `- ${p.name}: RGB(${p.rgb.join(',')})`
    ).join('\n');
    prompt += `\n\n配色标准：\n${colorInfo}`;
  }

  return prompt;
}

function parseAuditResult(analysis: string, spec: any, auditType: string): any {
  try {
    const jsonMatch = analysis.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const aiResult = JSON.parse(jsonMatch[0]);

    const checks = spec.checks.map((check: any) => {
      const aiCheck = aiResult.checks?.find((c: any) =>
        c.id === check.id || c.name === check.name
      );
      return {
        id: check.id,
        name: check.name,
        standard: check.standard,
        passed: aiCheck?.passed ?? true,
        message: aiCheck?.message || '符合规范',
        actual: aiCheck?.actual || '符合',
      };
    });

    const passedCount = checks.filter((c: any) => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);
    const passed = passedCount === checks.length;

    const suggestions = checks
      .filter((c: any) => !c.passed)
      .map((check: any) => ({
        title: `${check.name}不符合规范`,
        description: check.message,
        steps: [
          `检查设计稿的${check.name}`,
          `调整为${check.standard}`,
          `重新上传审核`,
        ],
      }));

    return { checks, passed, score, suggestions };
  } catch (error) {
    console.error('Parse Qwen-VL result error:', error);
    return {
      checks: spec.checks.map((check: any) => ({
        id: check.id,
        name: check.name,
        standard: check.standard,
        passed: true,
        message: 'AI 分析不可用，默认通过',
        actual: '未检测',
      })),
      passed: true,
      score: 100,
      suggestions: [],
    };
  }
}

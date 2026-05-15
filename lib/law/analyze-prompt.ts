export type LawAnalyzeFocus =
  | "legal_applicability"
  | "key_points"
  | "judgment_result"
  | "custom";

export function buildLawAnalyzePrompt(params: {
  url: string;
  focus: LawAnalyzeFocus[];
  customAngle?: string;
  extractedText: string;
}) {
  const focusText =
    params.focus.length === 0
      ? "法律适用、裁判要点、裁判结果"
      : params.focus
          .map((f) => {
            if (f === "legal_applicability") return "法律适用";
            if (f === "key_points") return "裁判要点";
            if (f === "judgment_result") return "裁判结果";
            return "自定义角度";
          })
          .join("、");

  const custom =
    params.focus.includes("custom") && params.customAngle?.trim()
      ? `\n\n## 其他角度\n${params.customAngle.trim()}\n`
      : "";

  const system = [
    "你是严谨的法律文本分析助手。",
    "只基于用户提供的原文进行分析，禁止编造原文中不存在的事实、程序或法条。",
    "如果原文缺失关键信息，明确写“原文未提供”。",
    "输出使用简体中文，Markdown 格式。",
    "每一块结论尽量引用原文关键句（用引号），并说明引用来自原文的大致位置（例如“原文中段/末尾”）。",
  ].join("\n");

  const user = `来源 URL：${params.url}

请按以下关注点进行分析：${focusText}。
${custom}

原文（已抽取与截断，可能包含噪声）：
"""
${params.extractedText}
"""`;

  return { system, user };
}


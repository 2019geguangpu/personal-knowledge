/**
 * 轻量「问法侧向」推断：不改动 Lance 检索 domain（仍以 UI 的 rag 为准），
 * 仅在 system 中追加一句提醒，降低「人在游戏域、话像工作」或反过来的错配感。
 * 后续若要做强意图（改检索域），应单独设计置信度与确认流，勿直接覆盖 rag。
 */
export type NarrativeIntent = "neutral" | "game_inflected" | "work_inflected";

export function inferNarrativeIntentFromQuery(query: string): NarrativeIntent {
  const q = query.trim();
  if (!q) return "neutral";
  const game =
    /铭文|装备|全流|搭配|词条|共鸣|流玉|唤|百科|王者|伤害|暴击|防御力|属性/i.test(
      q,
    );
  const work =
    /飞书|文档|需求|会议|纪要|项目|PRD|周报|OKR|markdown|md\b|知识库/i.test(q);
  if (game && !work) return "game_inflected";
  if (work && !game) return "work_inflected";
  return "neutral";
}

export function narrativeIntentHint(
  intent: NarrativeIntent,
  domain: "work" | "game",
): string | null {
  if (intent === "neutral") return null;
  if (domain === "work" && intent === "game_inflected") {
    return "（问法提示：用户表述偏游戏数据；当前检索为「工作」域。若检索片段明显不相关，请明确说明，并建议用户在界面将检索领域切到「游戏」后再问。）";
  }
  if (domain === "game" && intent === "work_inflected") {
    return "（问法提示：用户表述偏工作/文档；当前检索为「游戏」域。若检索片段明显不相关，请明确说明，并建议用户将检索领域切到「工作」后再问。）";
  }
  return null;
}

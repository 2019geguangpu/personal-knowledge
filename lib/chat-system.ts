import { GAME_JSON_QUERY_ASSISTANT_ADDENDUM } from "@/lib/game-inscription-llm-prompt";
import {
  inferNarrativeIntentFromQuery,
  narrativeIntentHint,
} from "@/lib/chat-intent";
import type { KbScope } from "@/lib/kb-scope";

function personaLine(domain: KbScope["domain"]): string {
  if (domain === "game") {
    return "你是「游戏资料」助手：基于下方检索到的游戏知识片段与用户问题作答；涉及数值比较时请严格遵守文末「游戏 JSON」规则。";
  }
  return "你是「本地知识库」助手：基于下方检索到的工作向资料回答用户问题。";
}

function domainHintLine(scope: KbScope): string {
  if (scope.domain === "game") {
    return `当前检索领域：游戏知识（${scope.sub_domain_label || scope.sub_domain}）；请勿引用与当前领域明显无关的其他知识库片段。`;
  }
  return "当前检索领域：工作向知识（含历史未标注 domain 的本地资料）；请勿引用与当前领域明显无关的其他知识库片段。";
}

/**
 * 拼装 chat system 全文。检索范围由 ragScope 决定；意图仅注入软提示。
 */
export function buildChatSystemPrompt(params: {
  ragScope: KbScope;
  contextBlock: string;
  latestUserQuery: string;
}): string {
  const { ragScope, contextBlock, latestUserQuery } = params;
  const intent = inferNarrativeIntentFromQuery(latestUserQuery);
  const intentLine = narrativeIntentHint(intent, ragScope.domain);

  const parts = [
    personaLine(ragScope.domain),
    domainHintLine(ragScope),
    intentLine,
    "优先依据下方检索到的上下文；若上下文不足，请明确说明并给出合理推断或建议。",
    "保持简洁、结构化，可使用 Markdown。",
    "",
    "--- 检索上下文 ---",
    contextBlock,
    "--- 上下文结束 ---",
  ].filter((s): s is string => s != null && s.length > 0);

  if (ragScope.domain === "game") {
    parts.push("", GAME_JSON_QUERY_ASSISTANT_ADDENDUM);
  }

  return parts.join("\n");
}

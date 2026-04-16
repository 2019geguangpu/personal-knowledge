import type { UIMessage } from "ai";

/** 从 UIMessage 中提取纯文本（用于 RAG 查询） */
export function getLatestUserText(messages: UIMessage[]): string {
  const users = messages.filter((m) => m.role === "user");
  const last = users[users.length - 1];
  if (!last?.parts?.length) return "";
  return last.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim();
}

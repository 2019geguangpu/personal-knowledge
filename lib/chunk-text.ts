import { CHUNK_OVERLAP, CHUNK_SIZE } from "@/lib/constants";

/**
 * 将长文本按近似固定长度切分，带重叠以保留边界语义。
 */
export function chunkText(
  text: string,
  maxChars = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + maxChars, normalized.length);
    const slice = normalized.slice(start, end).trim();
    if (slice.length > 0) chunks.push(slice);
    if (end >= normalized.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}

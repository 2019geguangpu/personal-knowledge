function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function extractTextFromHtml(html: string): string {
  const noScript = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const noTags = noScript.replace(/<[^>]+>/g, " ");
  const decoded = decodeHtmlEntities(noTags);
  return decoded
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function clampText(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input;
  return input.slice(0, maxChars) + "\n\n（内容过长，已截断）";
}


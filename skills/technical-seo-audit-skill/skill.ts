import type { SeoAuditSkill } from "@/lib/seo-audit/types";

type Severity = "HIGH" | "MEDIUM" | "LOW";

type Issue = {
  severity: Severity;
  rule: string;
  message: string;
  hint?: string;
};

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function matchAllCount(html: string, re: RegExp): number {
  let c = 0;
  let m: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((m = re.exec(html))) c += 1;
  return c;
}

function getTextBetween(html: string, startTag: RegExp, endTag: RegExp) {
  const s = html.search(startTag);
  if (s < 0) return "";
  const afterStart = html.slice(s).replace(startTag, "");
  const e = afterStart.search(endTag);
  if (e < 0) return afterStart.trim();
  return afterStart.slice(0, e).trim();
}

function extractMetaContent(html: string, name: string): string {
  const re1 = new RegExp(
    `<meta\\s+[^>]*name=["']${name}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  const re2 = new RegExp(
    `<meta\\s+[^>]*content=["']([^"']*)["'][^>]*name=["']${name}["'][^>]*>`,
    "i",
  );
  const m = html.match(re1) || html.match(re2);
  return m?.[1]?.trim() || "";
}

function scoreFromIssues(issues: Issue[]): number {
  let score = 100;
  for (const it of issues) {
    score -= it.severity === "HIGH" ? 25 : it.severity === "MEDIUM" ? 12 : 6;
  }
  return Math.max(0, Math.min(100, score));
}

export const seoAuditSkills: SeoAuditSkill[] = [
  {
    id: "tech_seo_report",
    name: "技术 SEO 审计报告（示例插件）",
    description:
      "基于 HTML 生成简版技术 SEO 审计报告（title/description/robots/headings/links），用于验证“插件 + 编排”的效果。",
    config_hint: `可选 config：
{
  "title_min": 10,
  "title_max": 70,
  "description_min": 50,
  "description_max": 160
}`,
    async run({ input, config }) {
      const html = asString((input as any)?.html, "");
      if (!html) throw new Error("tech_seo_report 需要 input.html（请先运行 fetch_html）");

      const titleMin = typeof config?.title_min === "number" ? config.title_min : 10;
      const titleMax = typeof config?.title_max === "number" ? config.title_max : 70;
      const descMin =
        typeof config?.description_min === "number" ? config.description_min : 50;
      const descMax =
        typeof config?.description_max === "number" ? config.description_max : 160;

      const title = getTextBetween(html, /<title[^>]*>/i, /<\/title>/i);
      const description = extractMetaContent(html, "description");
      const robotsRaw = extractMetaContent(html, "robots");
      const robots = robotsRaw.toLowerCase();
      const h1 = matchAllCount(html, /<h1(\s|>)/gi);
      const links = matchAllCount(html, /<a(\s|>)/gi);

      const issues: Issue[] = [];

      if (!title) {
        issues.push({
          severity: "HIGH",
          rule: "title.missing",
          message: "缺少 <title>。",
          hint: "为页面设置唯一且描述性的 title。",
        });
      } else {
        if (title.length < titleMin) {
          issues.push({
            severity: "MEDIUM",
            rule: "title.too_short",
            message: `title 过短（${title.length} < ${titleMin}）。`,
          });
        }
        if (title.length > titleMax) {
          issues.push({
            severity: "MEDIUM",
            rule: "title.too_long",
            message: `title 过长（${title.length} > ${titleMax}）。`,
          });
        }
      }

      if (!description) {
        issues.push({
          severity: "MEDIUM",
          rule: "meta_description.missing",
          message: "缺少 meta description。",
          hint: "为重要页面补齐 description，便于摘要展示。",
        });
      } else {
        if (description.length < descMin) {
          issues.push({
            severity: "LOW",
            rule: "meta_description.too_short",
            message: `description 过短（${description.length} < ${descMin}）。`,
          });
        }
        if (description.length > descMax) {
          issues.push({
            severity: "LOW",
            rule: "meta_description.too_long",
            message: `description 过长（${description.length} > ${descMax}）。`,
          });
        }
      }

      if (robots.includes("noindex")) {
        issues.push({
          severity: "HIGH",
          rule: "robots.noindex",
          message: "检测到 robots=noindex（页面可能不会被收录）。",
        });
      }

      if (h1 === 0) {
        issues.push({
          severity: "MEDIUM",
          rule: "headings.h1_missing",
          message: "缺少 H1。",
        });
      } else if (h1 > 1) {
        issues.push({
          severity: "LOW",
          rule: "headings.h1_multiple",
          message: `H1 数量偏多（${h1}）。`,
        });
      }

      if (links === 0) {
        issues.push({
          severity: "LOW",
          rule: "links.zero",
          message: "未检测到链接（<a>）。",
        });
      }

      const score = scoreFromIssues(issues);

      return {
        summary: {
          title,
          title_length: title.length,
          description,
          description_length: description.length,
          robots: robotsRaw,
          headings: { h1 },
          links_total: links,
        },
        issues,
        score,
      };
    },
  },
];


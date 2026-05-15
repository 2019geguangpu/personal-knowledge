import { getSerpApiKey } from "@/lib/env";

export type SerpApiOrganicResult = {
  position: number | null;
  title: string;
  link: string;
  snippet: string;
  source: "serpapi";
};

export async function serpApiWebSearch(params: {
  query: string;
  num?: number;
  hl?: string;
  gl?: string;
}): Promise<SerpApiOrganicResult[]> {
  const apiKey = getSerpApiKey();
  const q = params.query.trim();
  if (!q) return [];

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", q);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("num", String(params.num ?? 10));
  url.searchParams.set("hl", params.hl ?? "zh-CN");
  url.searchParams.set("gl", params.gl ?? "cn");

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SerpAPI 请求失败：${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`);
  }
  const data = (await res.json()) as any;
  const organic = Array.isArray(data?.organic_results) ? data.organic_results : [];

  return organic
    .map((r: any) => {
      const link = typeof r?.link === "string" ? r.link : "";
      const title = typeof r?.title === "string" ? r.title : "";
      const snippet =
        typeof r?.snippet === "string"
          ? r.snippet
          : typeof r?.snippet_highlighted_words === "string"
            ? r.snippet_highlighted_words
            : "";
      const position = typeof r?.position === "number" ? r.position : null;
      return {
        position,
        title,
        link,
        snippet,
        source: "serpapi" as const,
      };
    })
    .filter((r: SerpApiOrganicResult) => r.link.length > 0);
}


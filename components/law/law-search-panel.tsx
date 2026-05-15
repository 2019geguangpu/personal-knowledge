"use client";

import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LibraryResults, type LibrarySearchResult } from "@/components/law/library-results";
import { VerifyDetails, type VerifyResult } from "@/components/law/verify-details";

type WebSearchResult = {
  position: number | null;
  title: string;
  link: string;
  snippet: string;
  verify: VerifyResult;
};

type SearchResponse =
  | {
      trace_id: string;
      query: string;
      limit: number;
      count: number;
      results: LibrarySearchResult[];
    }
  | { error: string; trace_id?: string };

type WebSearchResponse =
  | {
      trace_id: string;
      provider: "serpapi";
      cached: boolean;
      query: string;
      num: number;
      count: number;
      results: WebSearchResult[];
    }
  | { error: string; trace_id?: string };

function isErrorResp(v: unknown): v is { error: string } {
  return (
    typeof v === "object" &&
    v != null &&
    "error" in v &&
    typeof (v as any).error === "string" &&
    (v as any).error.length > 0
  );
}

export function LawSearchPanel() {
  const [mode, setMode] = useState<"library" | "web">("library");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState<SearchResponse | null>(null);
  const [webResp, setWebResp] = useState<WebSearchResponse | null>(null);
  const [customAngle, setCustomAngle] = useState("");
  const [analysisMap, setAnalysisMap] = useState<
    Record<string, { busy: boolean; markdown?: string; error?: string }>
  >({});

  const results = useMemo(() => {
    if (!resp) return [];
    if ("results" in resp) return resp.results;
    return [];
  }, [resp]);

  const webResults = useMemo(() => {
    if (!webResp) return [];
    if ("results" in webResp) return webResp.results;
    return [];
  }, [webResp]);

  async function runSearch() {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setResp(null);
    setWebResp(null);
    try {
      const r = await fetch("/api/law/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = (await r.json()) as SearchResponse;
      setResp(data);
    } catch (err) {
      setResp({ error: err instanceof Error ? err.message : "请求失败" });
    } finally {
      setBusy(false);
    }
  }

  async function runWebSearch() {
    const q = query.trim();
    if (!q || busy) return;
    setBusy(true);
    setResp(null);
    setWebResp(null);
    try {
      const r = await fetch("/api/law/web-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, num: 10 }),
      });
      const data = (await r.json()) as WebSearchResponse;
      setWebResp(data);
    } catch (err) {
      setWebResp({ error: err instanceof Error ? err.message : "请求失败" });
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (mode === "library") return runSearch();
    return runWebSearch();
  }

  async function analyzeUrl(url: string) {
    setAnalysisMap((m) => ({ ...m, [url]: { busy: true } }));
    try {
      const focus = ["legal_applicability", "key_points", "judgment_result"];
      const payload: any = { url, focus };
      if (customAngle.trim()) {
        payload.focus = [...focus, "custom"];
        payload.custom_angle = customAngle.trim();
      }
      const r = await fetch("/api/law/analyze-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await r.json();
      if (!r.ok) {
        setAnalysisMap((m) => ({
          ...m,
          [url]: { busy: false, error: data?.error || "分析失败" },
        }));
        return;
      }
      setAnalysisMap((m) => ({
        ...m,
        [url]: { busy: false, markdown: data?.markdown || "" },
      }));
    } catch (err) {
      setAnalysisMap((m) => ({
        ...m,
        [url]: {
          busy: false,
          error: err instanceof Error ? err.message : "分析失败",
        },
      }));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>搜索</CardTitle>
          <CardDescription>
            你可以选择在“法律案例库（`law_chunks`）”中搜索，或先“全网搜（SerpAPI）”召回候选链接，再走 A/B/C 核验分级。
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={mode === "library" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("library")}
              disabled={busy}
            >
              法律库
            </Button>
            <Button
              type="button"
              variant={mode === "web" ? "default" : "outline"}
              size="sm"
              onClick={() => setMode("web")}
              disabled={busy}
            >
              全网搜（SerpAPI）
            </Button>
          </div>

          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="输入要检索的内容…（例如：行政处罚 程序违法 裁量基准）"
            rows={3}
            className="resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void run();
              }
            }}
            disabled={busy}
          />
          {mode === "web" && (
            <Textarea
              value={customAngle}
              onChange={(e) => setCustomAngle(e.target.value)}
              placeholder="可选：补充你希望 AI 额外分析的角度（例如：程序合法性、证据采信、裁量基准适用）"
              rows={2}
              className="resize-none"
              disabled={busy}
            />
          )}
          <div className="flex justify-end">
            <Button onClick={run} disabled={busy || !query.trim()}>
              {busy ? (
                <>
                  <Loader2 className="animate-spin" />
                  搜索中
                </>
              ) : (
                <>
                  <Search />
                  搜索
                </>
              )}
            </Button>
          </div>
          {isErrorResp(resp) && (
            <p className="text-sm text-red-600 dark:text-red-400">{resp.error}</p>
          )}
          {isErrorResp(webResp) && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {webResp.error}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {mode === "library" && resp && "results" in resp && (
          <p className="text-sm text-muted-foreground">
            命中 {resp.count} 条（trace_id：{resp.trace_id}）
          </p>
        )}
        {mode === "web" && webResp && "results" in webResp && (
          <p className="text-sm text-muted-foreground">
            命中 {webResp.count} 条（trace_id：{webResp.trace_id}
            {webResp.cached ? "，缓存命中" : ""}）
          </p>
        )}

        {mode === "library" && <LibraryResults results={results} />}

        {mode === "web" &&
          webResults.map((r, idx) => (
            <Card key={`${r.link}#${idx}`}>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    #{idx + 1}
                    {r.position != null ? ` · SERP#${r.position}` : ""} · {r.title || "（无标题）"}
                  </CardTitle>
                </div>
                <CardDescription className="break-all">{r.link}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {r.snippet && (
                  <pre className="whitespace-pre-wrap wrap-break-word rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed">
                    {r.snippet}
                  </pre>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-muted-foreground">
                    {r.verify.allowed
                      ? r.verify.tier === "A_official"
                        ? "A 官方来源"
                        : "B 权威来源"
                      : "未通过核验（不可分析）"}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void analyzeUrl(r.link)}
                    disabled={!r.verify.allowed || analysisMap[r.link]?.busy === true}
                  >
                    {analysisMap[r.link]?.busy ? (
                      <>
                        <Loader2 className="animate-spin" />
                        分析中
                      </>
                    ) : (
                      "AI 分析"
                    )}
                  </Button>
                </div>
                <VerifyDetails verify={r.verify} />

                {(analysisMap[r.link]?.error || analysisMap[r.link]?.markdown) && (
                  <details className="rounded-md border border-border bg-background px-3 py-2">
                    <summary className="cursor-pointer select-none text-sm font-medium">
                      分析结果
                    </summary>
                    <div className="mt-2 text-sm">
                      {analysisMap[r.link]?.error && (
                        <p className="text-red-600 dark:text-red-400">
                          {analysisMap[r.link]?.error}
                        </p>
                      )}
                      {analysisMap[r.link]?.markdown && (
                        <pre className="mt-2 whitespace-pre-wrap wrap-break-word rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed">
                          {analysisMap[r.link]?.markdown}
                        </pre>
                      )}
                    </div>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}

        {mode === "library" && resp && "results" in resp && resp.results.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              暂无命中。你可以先导入一些案例（下一步会做导入/分析入库），或换个更具体的检索词。
            </CardContent>
          </Card>
        )}

        {mode === "web" && webResp && "results" in webResp && webResp.results.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              暂无命中。可以换关键词，或稍后重试（SerpAPI 免费额度有限，本接口默认做了 10 分钟缓存）。
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


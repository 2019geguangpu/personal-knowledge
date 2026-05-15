"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VerifyDetails, type VerifyResult } from "@/components/law/verify-details";

export type LibrarySearchResult = {
  text: string;
  source: string;
  chunk_index: number;
  sub_domain: string;
  sub_domain_label: string;
  distance: number | null;
  verify: VerifyResult;
};

function formatDistance(d: number | null): string {
  if (d == null) return "—";
  return d.toFixed(4);
}

export function LibraryResults({ results }: { results: LibrarySearchResult[] }) {
  return (
    <>
      {results.map((r, idx) => (
        <Card key={`${r.source}#${r.chunk_index}#${idx}`}>
          <CardHeader className="gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">
                #{idx + 1} · {r.sub_domain || "—"}
                {r.sub_domain_label ? ` (${r.sub_domain_label})` : ""}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                distance：{formatDistance(r.distance)}
              </span>
            </div>
            <CardDescription className="break-all">
              来源：{r.source || "—"} · chunk #{r.chunk_index}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <pre className="whitespace-pre-wrap wrap-break-word rounded-md border border-border bg-muted/40 p-3 text-sm leading-relaxed">
              {r.text}
            </pre>
            <VerifyDetails verify={r.verify} />
          </CardContent>
        </Card>
      ))}
    </>
  );
}


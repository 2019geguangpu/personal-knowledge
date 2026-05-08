"use client";

import { Check, Clipboard, Copy } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { normalizeVisionImportText } from "@/lib/vision-import-text-normalize";
import { cn } from "@/lib/utils";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function valueForCopy(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

function previewValue(v: unknown, max = 72): string {
  const s = valueForCopy(v);
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

type Props = {
  text: string;
};

export function VisionResultCopyToolbar({ text }: Props) {
  const [flash, setFlash] = useState<string | null>(null);

  const parsed = useMemo(() => normalizeVisionImportText(text), [text]);

  const rootObject = useMemo(() => {
    if (
      !parsed.ok ||
      parsed.data == null ||
      typeof parsed.data !== "object" ||
      Array.isArray(parsed.data)
    ) {
      return null;
    }
    return parsed.data as Record<string, unknown>;
  }, [parsed]);

  const parsedOk = parsed.ok ? parsed : null;

  const flashKey = useCallback((key: string) => {
    setFlash(key);
    window.setTimeout(() => setFlash(null), 1600);
  }, []);

  const onCopyAll = useCallback(async () => {
    const ok = await copyToClipboard(text);
    if (ok) flashKey("__all__");
  }, [text, flashKey]);

  const onCopyPrettyJson = useCallback(async () => {
    if (!parsedOk) return;
    const pretty = `${JSON.stringify(parsedOk.data, null, 2)}\n`;
    const success = await copyToClipboard(pretty);
    if (success) flashKey("__json__");
  }, [parsedOk, flashKey]);

  const onCopyValue = useCallback(
    async (key: string, v: unknown) => {
      const ok = await copyToClipboard(valueForCopy(v));
      if (ok) flashKey(key);
    },
    [flashKey],
  );

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/60 p-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 min-w-30 touch-manipulation gap-1.5 sm:h-9"
          onClick={() => void onCopyAll()}
        >
          {flash === "__all__" ? (
            <Check className="size-4 text-emerald-600" aria-hidden />
          ) : (
            <Clipboard className="size-4" aria-hidden />
          )}
          复制全文
        </Button>
        {parsedOk ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 touch-manipulation gap-1.5 sm:h-9"
            onClick={() => void onCopyPrettyJson()}
          >
            {flash === "__json__" ? (
              <Check className="size-4 text-emerald-600" aria-hidden />
            ) : (
              <Copy className="size-4" aria-hidden />
            )}
            复制解析后 JSON
          </Button>
        ) : null}
      </div>

      {rootObject ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            已识别为 JSON 对象，可点「复制」仅复制对应字段值（便于 H5 粘贴到导入页）。
          </p>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border/80 bg-background p-1.5">
            {Object.keys(rootObject)
              .sort((a, b) => a.localeCompare(b))
              .map((key) => (
                <li
                  key={key}
                  className={cn(
                    "flex min-h-11 touch-manipulation items-center gap-2 rounded-sm px-1.5 py-1 sm:min-h-9",
                    "hover:bg-muted/60",
                  )}
                >
                  <span
                    className="min-w-0 flex-1 truncate font-mono text-xs text-foreground"
                    title={key}
                  >
                    {key}
                  </span>
                  <span
                    className="hidden max-w-[40%] truncate font-mono text-[11px] text-muted-foreground sm:inline"
                    title={previewValue(rootObject[key])}
                  >
                    {previewValue(rootObject[key])}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 touch-manipulation px-3 text-xs"
                    onClick={() => void onCopyValue(key, rootObject[key])}
                  >
                    {flash === key ? (
                      <Check className="size-3.5 text-emerald-600" aria-hidden />
                    ) : (
                      <Copy className="size-3.5" aria-hidden />
                    )}
                    <span className="ml-1">复制值</span>
                  </Button>
                </li>
              ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          若模型输出内嵌 JSON 对象，此处会列出各字段；否则请用「复制全文」。
        </p>
      )}
    </div>
  );
}

"use client";

import { FileUp, ImageIcon, Loader2 } from "lucide-react";
import { useCallback, useEffect, useReducer, useState } from "react";
import { VisionBatchResults } from "@/components/vision-batch-results";
import {
  visionBatchSlotsReducer,
  type VisionSlotAction,
} from "@/components/vision-batch-slots-reducer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { mapWithConcurrency } from "@/lib/map-with-concurrency";
import {
  DEFAULT_VISION_PROMPT,
  VISION_CONCURRENCY,
  VISION_FILE_INPUT_ID,
  VISION_IMAGE_ACCEPT,
  VISION_MAX_FILES,
  VISION_MAX_IMAGE_BYTES,
} from "@/lib/vision-debug-constants";
import { isLikelyVisionImageFile } from "@/lib/vision-file-filter";
import { cn } from "@/lib/utils";

const LOG = "[vision-debug]";

export function VisionDebugPanel() {
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    console.log(`${LOG} panel mounted`, {
      ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
      href: typeof window !== "undefined" ? window.location.href : "",
    });
  }, []);

  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_VISION_PROMPT);
  const [busy, setBusy] = useState(false);
  const [slots, dispatchSlots] = useReducer(visionBatchSlotsReducer, []);
  const [error, setError] = useState<string | null>(null);

  const headFile = files[0] ?? null;

  const addOrReplaceFiles = useCallback((list: FileList | File[] | null) => {
    if (!list || list.length === 0) {
      console.log(`${LOG} addOrReplaceFiles empty`);
      return;
    }
    const arr = Array.from(list).filter((f) => {
      const ok = isLikelyVisionImageFile(f);
      console.log(`${LOG} pick`, {
        name: f.name,
        type: f.type,
        size: f.size,
        accepted: ok,
      });
      return ok;
    });
    if (arr.length === 0) {
      setError("未识别到图片文件（相册 / 拍照均可）");
      return;
    }
    if (arr.length > VISION_MAX_FILES) {
      setError(`一次最多选择 ${VISION_MAX_FILES} 张图片`);
      return;
    }
    for (const f of arr) {
      if (!f.size || f.size > VISION_MAX_IMAGE_BYTES) {
        setError(
          `「${f.name || "未命名"}」过大或为空（单张上限 ${VISION_MAX_IMAGE_BYTES / 1024 / 1024}MB）`,
        );
        return;
      }
    }
    setFiles(arr);
    dispatchSlots({ type: "reset", slots: [] } satisfies VisionSlotAction);
    setError(null);
    console.log(`${LOG} setFiles count=${arr.length}`);
  }, []);

  useEffect(() => {
    if (!headFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(headFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [headFile]);

  const runVisionBatch = useCallback(async () => {
    if (files.length === 0) {
      setError("请先选择至少一张图片");
      return;
    }
    setBusy(true);
    setError(null);
    dispatchSlots({
      type: "reset",
      slots: files.map((f) => ({
        name: f.name || "（未命名）",
        status: "pending" as const,
      })),
    } satisfies VisionSlotAction);

    try {
      await mapWithConcurrency(files, VISION_CONCURRENCY, async (f, i) => {
        dispatchSlots({
          type: "patch",
          index: i,
          patch: { status: "running" },
        } satisfies VisionSlotAction);
        try {
          const fd = new FormData();
          fd.set("image", f);
          fd.set("prompt", prompt);
          const res = await fetch("/api/dev/vision-describe", {
            method: "POST",
            body: fd,
          });
          const data = (await res.json()) as {
            ok?: boolean;
            error?: string;
            text?: string;
            model?: string;
            savedTo?: string;
          };
          if (!res.ok) {
            throw new Error(data.error ?? `请求失败（${res.status}）`);
          }
          dispatchSlots({
            type: "patch",
            index: i,
            patch: {
              status: "done",
              text: data.text ?? "",
              model: typeof data.model === "string" ? data.model : undefined,
              savedTo:
                typeof data.savedTo === "string" ? data.savedTo : undefined,
            },
          } satisfies VisionSlotAction);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "请求失败";
          dispatchSlots({
            type: "patch",
            index: i,
            patch: { status: "error", error: msg },
          } satisfies VisionSlotAction);
        }
      });
    } finally {
      setBusy(false);
    }
  }, [files, prompt]);

  const clearFiles = useCallback(() => {
    if (busy) return;
    setFiles([]);
    dispatchSlots({ type: "reset", slots: [] } satisfies VisionSlotAction);
    setError(null);
  }, [busy]);

  const terminalCount = slots.filter(
    (s) => s.status === "done" || s.status === "error",
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          视觉调试
        </CardTitle>
        <CardDescription>
          支持<strong>多选图片</strong>；识别时以{" "}
          <strong>{VISION_CONCURRENCY} 路并发</strong>{" "}
          请求接口，其余自动排队。每次成功仍会写入{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            data/vision-captures/
          </code>{" "}
          。模型来自{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            SILICONFLOW_VL_MODEL
          </code>
          。若使用{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">pnpm start</code>
          ，请在 <code className="rounded bg-muted px-1 py-0.5 text-xs">.env</code>{" "}
          中设置{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            ALLOW_VISION_DEBUG=1
          </code>{" "}
          后重启。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          id={VISION_FILE_INPUT_ID}
          type="file"
          accept={VISION_IMAGE_ACCEPT}
          multiple
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            addOrReplaceFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <label
          htmlFor={VISION_FILE_INPUT_ID}
          onDragEnter={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (busy) return;
            addOrReplaceFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex min-h-44 cursor-pointer touch-manipulation flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors [-webkit-tap-highlight-color:transparent]",
            drag
              ? "border-primary bg-primary/5"
              : "border-border active:border-primary/60 active:bg-muted/50 hover:border-primary/50 hover:bg-muted/40",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <FileUp className="h-9 w-9 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">选择截图（可多选）</p>
            <p className="text-xs text-muted-foreground">
              点击或拖拽；电脑一次可选多张。最多 {VISION_MAX_FILES}{" "}
              张，并发 {VISION_CONCURRENCY} 路识别。
            </p>
          </div>
          {files.length > 0 ? (
            <p className="max-w-full truncate px-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              已选 {files.length} 张
              {files.length === 1
                ? `：${files[0]!.name || "（未命名）"}`
                : `（首张：${headFile?.name || "—"}）`}
            </p>
          ) : null}
        </label>

        {files.length > 0 && !busy ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={clearFiles}>
              清空已选
            </Button>
          </div>
        ) : null}

        {previewUrl && headFile ? (
          <div className="space-y-1">
            {files.length > 1 ? (
              <p className="text-xs text-muted-foreground">
                共 {files.length} 张，下方为首张预览。
              </p>
            ) : null}
            <div className="overflow-hidden rounded-lg border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="首张预览"
                className="max-h-48 w-full object-contain bg-muted/40"
              />
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground">提示词（每张图共用）</span>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            disabled={busy}
            className="resize-none text-sm"
          />
        </div>

        <Button
          type="button"
          disabled={busy || files.length === 0}
          title={
            files.length === 0 && !busy
              ? "请先在上方的虚线框内选择图片。"
              : undefined
          }
          onClick={() => void runVisionBatch()}
        >
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              识别中 {terminalCount}/{slots.length || files.length}…
            </>
          ) : (
            `开始识别${files.length > 1 ? `（${files.length} 张）` : ""}`
          )}
        </Button>

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
            {error}
          </p>
        )}

        <VisionBatchResults slots={slots} />
      </CardContent>
    </Card>
  );
}

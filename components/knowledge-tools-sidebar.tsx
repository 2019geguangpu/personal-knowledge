import Link from "next/link";
import { FeishuImport } from "@/components/feishu-import";
import { FileUpload } from "@/components/file-upload";
import { VisionDebugPanel } from "@/components/vision-debug-panel";

/**
 * 左侧资料接入区：文本导入、飞书、视觉调试；大屏 sticky 滚动，避免与对话抢高度。
 */
export function KnowledgeToolsSidebar() {
  return (
    <div
      className={
        "flex min-h-0 w-full flex-col gap-4 " +
        "lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1 " +
        "lg:sticky lg:top-8 lg:self-start"
      }
    >
      <header className="shrink-0 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
        <p className="text-sm font-medium tracking-tight">资料接入</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          文本与飞书写入向量库；截图走视觉模型做本地调试。
        </p>
        {process.env.NODE_ENV === "development" ? (
          <p className="mt-2 text-xs">
            <Link
              href="/dev/json-import"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              JSON 导入（dev）→ data/imported
            </Link>
          </p>
        ) : null}
      </header>
      <div className="flex min-h-0 flex-col gap-4 pb-2">
        <FileUpload />
        <FeishuImport />
        <VisionDebugPanel />
      </div>
    </div>
  );
}

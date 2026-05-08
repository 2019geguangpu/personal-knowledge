import Link from "next/link";
import { DevJsonImportPanel } from "@/components/dev-json-import-panel";
import { isDevImportedJsonSaveEnabled } from "@/lib/dev-imported-json-guard";

export const dynamic = "force-dynamic";

export default function DevJsonImportPage() {
  const enabled = isDevImportedJsonSaveEnabled();

  if (!enabled) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <div className="mx-auto max-w-lg rounded-lg border border-border bg-muted/20 p-6 text-sm">
          <p className="font-medium">该页面仅在本地开发模式可用</p>
          <p className="mt-2 text-muted-foreground">
            请使用 <code className="rounded bg-muted px-1">pnpm dev</code>{" "}
            启动；生产构建下不会开放写入{" "}
            <code className="rounded bg-muted px-1">data/imported</code> 的接口。
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Dev only
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            导入 JSON 到仓库
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            写入 <code className="rounded bg-muted px-1">data/imported/*.json</code>
            ，随 Git 提交；服务器无需配置。
          </p>
        </header>
        <DevJsonImportPanel />
      </div>
    </div>
  );
}

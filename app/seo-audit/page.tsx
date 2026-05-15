import Link from "next/link";
import { ArrowLeft, SearchCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SeoAuditPanel } from "@/components/seo/seo-audit-panel";

export const dynamic = "force-dynamic";

export default function SeoAuditHome() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <SearchCheck className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                SEO 审计
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              通过 Next 转发 NestJS skill-runner：安装 zip、查看已安装列表、运行 skill（input 含 url 与可选 steps）。
            </p>
          </div>
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeft />
            返回
          </Link>
        </header>

        <SeoAuditPanel />
      </main>
    </div>
  );
}


import Link from "next/link";
import { ArrowLeft, Scale } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LawSearchPanel } from "@/components/law/law-search-panel";

export const dynamic = "force-dynamic";

export default function LawHome() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                法律案例
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              白名单官方来源核验 → 模板化分析 → 入库到独立表（`law_chunks`）。
            </p>
          </div>
          <Link href="/" className={buttonVariants({ variant: "ghost" })}>
            <ArrowLeft />
            返回
          </Link>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>法律案例库</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            先提供“搜索 + 结果 + 来源校验”界面；导入/模板分析/入库会在下一步补齐。
          </CardContent>
        </Card>

        <section className="mt-6">
          <LawSearchPanel />
        </section>
      </main>
    </div>
  );
}


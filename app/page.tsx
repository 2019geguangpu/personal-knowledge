import Link from "next/link";
import { ArrowRight, LibraryBig, Scale, SearchCheck } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-10 sm:mb-14">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            本地知识库 RAG
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            选择你要进入的工作区：个人知识库（你自己的资料）或法律案例（官方来源核验 +
            模板化分析 + 独立案例库）。
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <Card className="relative overflow-hidden">
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2">
                <LibraryBig className="h-5 w-5 text-muted-foreground" />
                <CardTitle>个人知识库</CardTitle>
              </div>
              <CardDescription className="max-w-[56ch]">
                资料接入（上传/飞书/视觉）+ 对话检索（RAG）。
              </CardDescription>
              <div className="pt-2">
                <Link href="/kb" className={buttonVariants({ variant: "default" })}>
                  进入
                  <ArrowRight />
                </Link>
              </div>
            </CardHeader>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-muted-foreground" />
                <CardTitle>法律案例</CardTitle>
              </div>
              <CardDescription className="max-w-[56ch]">
                仅白名单官方来源；按固定模板输出分析，并沉淀到独立案例库（`law_chunks`）。
              </CardDescription>
              <div className="pt-2">
                <Link href="/law" className={buttonVariants({ variant: "outline" })}>
                  进入
                  <ArrowRight />
                </Link>
              </div>
            </CardHeader>
          </Card>

          <Card className="relative overflow-hidden">
            <CardHeader className="gap-2">
              <div className="flex items-center gap-2">
                <SearchCheck className="h-5 w-5 text-muted-foreground" />
                <CardTitle>SEO 审计（测试平台）</CardTitle>
              </div>
              <CardDescription className="max-w-[56ch]">
                以“skill 插件”方式扩展检查项；自由编排执行顺序，逐步查看输出与最终结果。
              </CardDescription>
              <div className="pt-2">
                <Link href="/seo-audit" className={buttonVariants({ variant: "outline" })}>
                  进入
                  <ArrowRight />
                </Link>
              </div>
            </CardHeader>
          </Card>
        </section>
      </main>
    </div>
  );
}

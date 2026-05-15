import { ChatPanel } from "@/components/chat-panel";
import { KnowledgeToolsSidebar } from "@/components/knowledge-tools-sidebar";

export const dynamic = "force-dynamic";

export default function KbHome() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
        <header
          className={
            "sticky top-0 z-40 -mx-4 mb-6 border-b border-border bg-background/95 px-4 pb-5 pt-2 " +
            "backdrop-blur-sm supports-backdrop-filter:bg-background/80 " +
            "sm:-mx-6 sm:mb-8 sm:px-6 sm:pb-6 sm:pt-3"
          }
        >
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            个人知识库
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            左侧接入资料，右侧检索对话。大屏为双栏；手机端对话在上、工具在下。
          </p>
        </header>

        <div
          className={
            "flex flex-col gap-8 " +
            "lg:grid lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-x-10 lg:gap-y-0"
          }
        >
          {/* 小屏：对话在上；大屏：本节点占右栏 */}
          <section className="order-1 min-h-0 min-w-0 lg:order-0 lg:col-start-2 lg:row-start-1">
            <ChatPanel />
          </section>
          {/* 小屏：工具在下；大屏：本节点占左栏 */}
          <aside
            aria-label="资料接入与工具"
            className="order-2 min-w-0 lg:order-0 lg:col-start-1 lg:row-start-1"
          >
            <KnowledgeToolsSidebar />
          </aside>
        </div>
      </main>
    </div>
  );
}


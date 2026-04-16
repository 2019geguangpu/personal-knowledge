import { ChatPanel } from "@/components/chat-panel";
import { FeishuImport } from "@/components/feishu-import";
import { FileUpload } from "@/components/file-upload";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:gap-8">
      <section className="flex w-full shrink-0 flex-col gap-6 lg:max-w-sm">
        <FileUpload />
        <FeishuImport />
      </section>
      <section className="min-h-0 flex-1">
        <ChatPanel />
      </section>
    </main>
  );
}

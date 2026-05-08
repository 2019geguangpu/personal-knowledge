# components 组件地图（按功能分组）

> 目标：避免 `components/` 平铺增长；让页面组合更语义化、可维护。

## 领域：对话（chat）

- `chat-panel.tsx`: 对话主面板（输入框、消息列表、RAG scope 控制、发送/停止）
- `chat-message-list.tsx`: 消息气泡列表（user/assistant 展示）
- `chat-markdown.tsx`: Markdown 渲染（GFM + Mermaid 代码块）
- `rag-scope-bar.tsx`: 检索领域切换（work/game + game preset）

## 领域：资料接入（knowledge tools）

- `knowledge-tools-sidebar.tsx`: 左侧“资料接入”容器（导入 + 飞书 + 视觉调试入口）
- `file-upload.tsx`: 上传纯文本并入库（`/api/ingest`）
- `feishu-import.tsx`: 批量拉取飞书 docx 并入库（`/api/feishu/import`）

## 领域：视觉（vision）

- `vision-debug-panel.tsx`: 视觉调试面板（多选图片、并发请求、预览、错误提示）
- `vision-batch-slots-reducer.ts`: 批量识别 slots reducer（状态机）
- `vision-batch-results.tsx`: 批量结果列表与展开详情
- `vision-result-copy-toolbar.tsx`: 结果复制工具栏（全文/pretty JSON/字段值）

## 领域：开发工具（dev）

- `dev-json-import-panel.tsx`: 粘贴内容保存到 `data/imported`（dev only）
- `dev-json-import-file-list.tsx`: 已有 imported json 文件列表（载入/刷新）

## 组件：渲染能力（renderers）

- `mermaid-diagram.tsx`: Mermaid 渲染（动态 import + theme）

## 基础组件：UI（shadcn/ui）

- `ui/button.tsx`
- `ui/card.tsx`
- `ui/textarea.tsx`

## 约定（之后怎么继续整理）

- **不要继续平铺**：新增组件优先放到子目录（例如 `components/chat/*`、`components/vision/*`、`components/dev/*`），根目录只留“领域入口组件”（例如 `ChatPanel`、`KnowledgeToolsSidebar`）。
- **命名**：容器/页面级用 `*Panel` / `*Sidebar`；纯展示用 `*List` / `*Toolbar`；逻辑状态机放 `*.reducer.ts` 或 `*.logic.ts`。
- **client/server 边界**：含 hooks/事件/浏览器 API 的组件必须有 `"use client"`；纯渲染/无副作用的组件尽量保持 server-safe。


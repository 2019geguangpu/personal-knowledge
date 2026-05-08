# personal-knowledge

基于 Next.js、LanceDB 与 SiliconFlow 的轻量本地知识库（RAG）Web 应用。

## 这是什么

- **目标**：把本地/导入的文本资料写入向量库，聊天时进行向量检索（RAG），把命中的片段作为上下文交给大模型生成回答。
- **技术栈**：Next.js（App Router）+ TailwindCSS + shadcn/ui + LanceDB（本地向量库）+ SiliconFlow（OpenAI 兼容 API：embeddings / chat）。
- **数据落地**：向量库落在 `VECTOR_DB_PATH`（默认 `./data/lancedb`）下，部署升级时要把它当作“数据目录”做持久化与备份。

## RAG 的工作流（导入 → 检索 → 回答）

1. **导入**（见 `/api/ingest`、`/api/feishu/import` 等）：读入原始文本。
2. **切分**（`lib/chunk-text.ts`）：把长文本切成多个 chunk。
3. **向量化**（`lib/siliconflow-embeddings.ts`）：对每个 chunk 调用 embeddings 得到向量。
4. **入库**（`lib/lancedb.ts`）：写入 LanceDB 表（默认 `kb_chunks`）。
5. **检索**（聊天时，`app/api/chat/route.ts`）：对用户 query 向量化 → 召回 top-k chunks → 拼成上下文块。
6. **生成**（`lib/chat-system.ts`）：把“上下文块 + 约束提示词 + 用户消息”发给 chat 模型流式输出。

## 切分策略（当前实现）

当前切分是**按字符长度滑窗切分**（不做段落/句子/Markdown 结构识别），用于快速稳定地把任意长文本写入向量库。

- **Chunk 大小**：`CHUNK_SIZE = 900`（字符）
- **重叠**：`CHUNK_OVERLAP = 120`（字符）
- **规范化**：把 `\r\n` 统一成 `\n`，并 `trim()`；空文本直接返回空数组
- **实现位置**：`lib/chunk-text.ts`、参数在 `lib/constants.ts`

## 检索参数（RAG）

- **Top-K**：`RAG_TOP_K = 6`（见 `lib/constants.ts`）
- **命中片段格式**：聊天接口会把每条命中拼成 `【片段 i · domain=... · sub=... · 来源 ... · #chunk_index】\n<chunk text>` 并用分隔线连接（见 `app/api/chat/route.ts`）
- **Scope（分域检索）**：检索支持按 `domain / sub_domain / sub_domain_label` 做过滤（见 `lib/kb-scope.ts`，并在聊天与导入接口里解析）

## 目录速览（从这里找代码）

- **接口路由**：`app/api/**/route.ts`
  - `app/api/chat/route.ts`：聊天 + RAG 检索 + 流式输出
  - `app/api/ingest/route.ts`：上传文件导入纯文本到向量库（表单字段 `file`）
  - `app/api/feishu/import/route.ts`：飞书导入（需要飞书应用凭证）
  - `app/api/admin/backfill-kb-scope/route.ts`：管理/修复类接口（按需使用）
  - `app/api/dev/*`：开发调试用接口（导入 JSON、视觉描述等）
- **核心库**：`lib/**`
  - `lib/chunk-text.ts`：切分
  - `lib/ingest-kb.ts`：把文本切分→向量化→写入 LanceDB
  - `lib/lancedb.ts`：LanceDB 表操作（插入/检索）
  - `lib/siliconflow-embeddings.ts`：embeddings 调用封装
  - `lib/chat-system.ts`：system prompt 组装
  - `lib/env.ts`：环境变量读取与校验
- **界面**：`app/page.tsx`、`components/**`（聊天面板、导入面板等）

## 本地开发

1. 复制环境变量模板并填写：

   ```bash
   cp .env.example .env
   ```

2. 安装依赖并启动开发服务（需本机已安装 Node.js、pnpm）：

   ```bash
   pnpm install
   pnpm dev
   ```

3. 浏览器访问开发服务器提示的地址（一般为 `http://localhost:3000`）。

## 环境变量

说明见 [`.env.example`](./.env.example)。生产环境建议：

- **`SILICONFLOW_API_KEY`**：必填。
- **`VECTOR_DB_PATH`**：向量库目录；生产环境建议使用**绝对路径**，避免工作目录变化导致找不到数据。
- 飞书导入：仅在使用 `/api/feishu/import` 时配置 **`FEISHU_APP_ID`**、**`FEISHU_APP_SECRET`**。

**请勿将 `.env` 提交到 Git。**

---

## 生产环境运维（单机示例）

以下假设：服务器上项目路径为 `<项目根>`，进程用 **PM2** 托管 **`pnpm start`**（监听 `3000`），前面有 **Nginx** 反代与 HTTPS（可选）。

### 更新代码后如何生效

在服务器上进入项目目录，拉取最新代码：

```bash
cd <项目根>
git pull
```

按变更类型决定后续步骤：

| 变更内容 | 需要执行 |
|----------|----------|
| 仅改服务端逻辑、API、`.env`、静态 `public/` 等，**未**改 `package.json` 依赖 | 通常 **`pm2 restart <应用名>`** 即可；若改了 `NEXT_PUBLIC_*` 或不确定，**再执行一次 `pnpm build`** 更稳妥。 |
| 新增或升级 **npm 依赖**（`package.json` / `pnpm-lock.yaml` 有变） | `pnpm install --frozen-lockfile`（或 `pnpm install`），再 **`pnpm build`**，最后 **`pm2 restart <应用名>`**。 |
| 改了 **Next 页面/组件/路由** 等需重新构建的源码 | **`pnpm build`**，然后 **`pm2 restart <应用名>`**。 |

查看 PM2 中的应用名：

```bash
pm2 list
```

重启示例：

```bash
pm2 restart personal-knowledge
```

查看日志：

```bash
pm2 logs personal-knowledge --lines 100
```

### 环境变量修改后

在项目根目录编辑 `.env` 后，**重启进程**即可加载（服务端变量）：

```bash
pm2 restart <应用名>
```

若仅修改了以 **`NEXT_PUBLIC_`** 开头的变量（会打进前端包），需要 **`pnpm build`** 后再重启。

### 数据目录

向量库默认在 `VECTOR_DB_PATH` 指向的目录（默认 `./data/lancedb`）。部署与备份时请确认该路径在磁盘上**持久存在**，升级应用时不要误删。

### HTTPS（Let’s Encrypt）与续期

若使用 **Certbot** 的 **webroot** 方式，且 webroot 指向本仓库的 **`public`**，校验路径为 `public/.well-known/acme-challenge/`。续期一般由系统 **`certbot renew`** 定时任务执行；续期时应用需能正常提供静态文件，**保持 Nginx 反代到本应用**即可。

---

## 从国内服务器拉代码

若 GitHub 访问不稳定，可将远程仓库设为 Gitee 等镜像，在服务器上仅 `git clone` / `git pull` 镜像地址；本机向 GitHub 与 Gitee **双推送**时需自行保持同步（`git push` 到两个 remote）。

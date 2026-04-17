# personal-knowledge

基于 Next.js、LanceDB 与 SiliconFlow 的轻量本地知识库（RAG）Web 应用。

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

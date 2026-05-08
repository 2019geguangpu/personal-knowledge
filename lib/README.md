# lib 模块地图（按领域分组）

> 目标：避免 `lib/` 平铺文件“只剩列表”，让新增/改动时先想到领域边界与入口。

## 领域：RAG / 知识库（kb）

- `constants.ts`: RAG 相关默认常量（chunk、top-k、模型默认值等）
- `kb-scope.ts`: 检索/入库作用域（domain + sub_domain）；where 子句生成
- `chunk-text.ts`: 入库分块逻辑
- `siliconflow-embeddings.ts`: 嵌入向量（SiliconFlow OpenAI 兼容）
- `lancedb.ts`: LanceDB 连接、入库、向量检索
- `ingest-kb.ts`: 将纯文本切块 + 嵌入 + 写入 LanceDB
- `lance-backfill-kb-scope.ts`: 旧表结构补齐 domain/sub_domain 的迁移逻辑

## 领域：对话（chat）

- `chat-system.ts`: 组装 system prompt（结合 RAG scope 与 intent 软提示）
- `chat-intent.ts`: 轻量“问法侧向”推断（只影响 system 文案，不改变检索域）
- `ui-message-text.ts`: 从 `UIMessage[]` 提取用户文本（供 RAG 查询）

## 领域：视觉（vision）

- `vision-debug-constants.ts`: 视觉相关 UI/限制常量（文件 accept、并发、大小等）
- `vision-file-filter.ts`: 判断 `File` 是否可能是图片（浏览器侧）
- `vision-import-text-normalize.ts`: 将松散文本/模型输出归一成可 JSON 序列化结构（dev 导入）
- `vision-capture-store.ts`: 将单次识别结果落盘到 `data/vision-captures`

## 领域：第三方集成（integrations）

- `feishu-client.ts`: 飞书 tenant token 与 docx raw_content 拉取

## 领域：dev 工具 & 数据导入（dev）

- `dev-imported-json-guard.ts`: 仅在 development 下启用 imported-json 写入
- `imported-json-filename.ts`: `data/imported` 文件名与目录安全校验

## 领域：游戏数据工具（game）

- `game-inscription-llm-prompt.ts`: 游戏域 system addendum（铭文/装备 JSON 规则）
- `sort-list-by-stat-tool.ts`: LLM tool 定义（ai/tool）
- `sort-list-by-stat.logic.ts`: 排序逻辑（从 JSON 找列表并按属性数值排序）

## 基础设施 / 通用（infra / shared）

- `env.ts`: 读取环境变量与默认值
- `logger.ts`: pino 日志（写入文件、可选轮转）
- `map-with-concurrency.ts`: 固定并发任务池
- `utils.ts`: `cn()` 等前端通用工具

## 约定（之后怎么继续整理）

- **新增 lib 文件前先选领域**：优先放到对应子目录（未来迁移时）或至少在本 README 增补一行。
- **跨领域依赖**：尽量从“领域入口”引用（见 `lib/index.ts`），避免到处散落的深层文件引用。
- **长文件拆分**：遵循 `.cursor/rules/coding-notion.mdc` 的 350 行约束（拆出 `.logic.ts` / `.helper.ts` 或 hook）。


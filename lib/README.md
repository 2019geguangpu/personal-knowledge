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

## 领域：法律案例（law）

- `law/source-verify.ts`: 法律来源白名单校验（支持 `*.court.gov.cn` 前缀通配）
- `law/serpapi-client.ts`: SerpAPI 全网搜索（Google engine），返回候选链接供核验与后续抓取

## 领域：SEO 审计（seo-audit）

- `seo-audit/types.ts`: skill / step / pipeline 的类型定义（前端编排可复用）
- `skill-runner-forward.ts`: Next Route Handler 转发到 NestJS `skill-runner`（`SKILL_RUNNER_URL`）

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



### 法律适用分析

1. **行政诉讼主体资格**  
   - 法院认为："某些事业单位、社会团体，虽然不具有行政机关的资格，但是法律赋予它行使一定的行政管理职权"，因此北京科技大学作为高等教育机构，其颁发学业证书的行为属于行政权力行使范畴（原文中段）。  
   - 依据《行政诉讼法》第二十五条，本案适用行政诉讼程序（原文中段）。

2. **学籍管理合法性**  
   - 法院指出："北京科技大学的‘068号通知’对‘考试作弊’的处理方法明显重于《普通高等学校学生管理规定》第十二条"，且与第二十九条退学条件相抵触，认定该规定无效（原文中段）。  
   - 学校未直接向田永送达退学决定，程序违法（原文中段）。

3. **学业证书与学位授予**  
   - 引用《教育法》第二十一条、第二十二条及《学位条例》第八条，明确学校有义务对符合条件的学生颁发证书（原文中段）。  
   - 学位授予需按《学位条例暂行实施办法》第四条、第五条程序审核（原文末尾）。

---

### 裁判要点

1. **学籍存续的认定**  
   - 法院认为："北京科技大学实际上从未给田永办理过注销学籍手续"，且补办学生证、注册等行为视为撤销退学决定（原文中段）。  
   - 学校后续允许田永参与学习、考试等行为，进一步证明其学籍未被实际取消（原文中段）。

2. **退学决定的程序瑕疵**  
   - 学校未履行"宣布、送达"程序，剥夺当事人申辩权利，行政行为不合法（原文中段）。  
   - 退学决定因程序违法和实体规定冲突而无效（原文中段）。

3. **赔偿与名誉权主张的驳回**  
   - 拒发证书未对田永人身权、财产权造成实际损害，不符合《国家赔偿法》第三条、第四条规定（原文中段）。  
   - 退学决定未损害名誉权，故赔礼道歉请求不予支持（原文中段）。

---

### 裁判结果

1. **一审判决（北京市海淀区人民法院）**  
   - 被告需在30日内颁发毕业证（原文末尾）。  
   - 60日内组织学位评定委员会审核田永学位资格（原文末尾）。  
   - 30日内履行上报毕业派遣手续的职责（原文末尾）。  
   - 驳回其他诉讼请求（原文末尾）。

2. **二审结果（北京市第一中级人民法院）**  
   - 驳回北京科技大学上诉，维持原判（原文末尾）。  
   - 法院认定："校规、校纪必须符合法律、法规和规章的规定"，退学处理因违法而无效（原文末尾）。

---

**引用说明**：所有结论均直接引用自原文中段至末尾的法院认定部分，未添加外部信息。

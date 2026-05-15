# SKILL：tech_seo_report

## 输入

- 上一步输出应包含：
  - `html`：页面 HTML 字符串（建议先运行 `fetch_html`）

## 输出

返回结构化对象：

- `summary`：摘要（title/description/robots 等）
- `issues`：问题列表（含 severity）
- `score`：0~100 的粗略评分（便于测试编排效果，不代表权威评分）


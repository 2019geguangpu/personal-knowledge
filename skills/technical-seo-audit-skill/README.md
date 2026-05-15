# Technical SEO Audit Skill（示例插件）

这是一个示例 skill 包，用于演示“插件式新增 skill + 编排执行”的完整落地。

## 如何使用

1. 打开页面：`/seo-audit`
2. pipeline 中先加入 `fetch_html`
3. 再加入本插件提供的 `tech_seo_report`
4. 运行后在结果里查看报告结构化输出

## 入口文件

- `skill.ts`: 导出 `seoAuditSkills`


# skills（插件）

> 约定：每个 skill 包是一个可独立发布/复用的目录；平台侧通过显式 import 注册（避免运行时扫描带来的打包不确定性）。

## 目录结构约定（示例）

```
skills/
  technical-seo-audit-skill/
    README.md
    SKILL.md
    audit-rules.md
    example-report.md
    CHANGELOG.md
    LICENSE
    .gitignore
    skill.manifest.json
    skill.ts
    scripts/
      update_seo_audit_multilingual.py
    _local/
      reports/
      drafts/
      screenshots/
      temp/
```

## 平台如何加载

- `skills/<pkg>/skill.ts` 需要导出 `seoAuditSkills: SeoAuditSkill[]`
- 平台侧在 `lib/seo-audit/registry.ts` 显式 import 并注册


import type { AddColumnsSql } from "@lancedb/lancedb";
import { LANCE_TABLE_NAME } from "@/lib/constants";
import { openKbChunksTable } from "@/lib/lancedb";

export type LanceKbScopeBackfillResult = {
  ok: true;
  steps: string[];
};

export type LanceKbScopeBackfillError = {
  ok: false;
  error: string;
};

function schemaColumnNames(schema: {
  fields: readonly { name: string }[];
}): Set<string> {
  return new Set(schema.fields.map((f) => f.name));
}

/**
 * 为旧版 kb_chunks 补齐 domain / sub_domain / sub_domain_label。
 * 假定存量数据均为工作向：缺列时用 SQL 常量写入 work / general / 空串；已有列则只回填 NULL。
 * 可重复执行（幂等）。
 */
export async function backfillKbScopeColumnsForLegacyWorkData(): Promise<
  LanceKbScopeBackfillResult | LanceKbScopeBackfillError
> {
  const steps: string[] = [];
  const table = await openKbChunksTable();
  if (!table) {
    steps.push(`未找到表 ${LANCE_TABLE_NAME}，跳过。`);
    return { ok: true, steps };
  }

  const schema = await table.schema();
  const names = schemaColumnNames(schema);
  const hasDomain = names.has("domain");
  const hasSub = names.has("sub_domain");
  const hasLabel = names.has("sub_domain_label");

  if (!hasDomain && !hasSub && !hasLabel) {
    const cols: AddColumnsSql[] = [
      { name: "domain", valueSql: "'work'" },
      { name: "sub_domain", valueSql: "'general'" },
      { name: "sub_domain_label", valueSql: "''" },
    ];
    await table.addColumns(cols);
    steps.push(
      "已为所有历史行添加三列：domain=work、sub_domain=general、sub_domain_label 为空。",
    );
    return { ok: true, steps };
  }

  if (!(hasDomain && hasSub && hasLabel)) {
    return {
      ok: false,
      error: `表结构不完整（domain=${hasDomain}，sub_domain=${hasSub}，sub_domain_label=${hasLabel}）。请备份后手动处理，勿重复半迁移。`,
    };
  }

  const nullDomain = await table.countRows("domain IS NULL");
  if (nullDomain > 0) {
    await table.update({
      where: "domain IS NULL",
      valuesSql: {
        domain: "'work'",
        sub_domain: "'general'",
        sub_domain_label: "''",
      },
    });
    steps.push(`已将 ${nullDomain} 行 domain 为空的记录标为 work/general。`);
  }

  const nullSubWork = await table.countRows(
    "domain = 'work' AND sub_domain IS NULL",
  );
  if (nullSubWork > 0) {
    await table.update({
      where: "domain = 'work' AND sub_domain IS NULL",
      valuesSql: { sub_domain: "'general'" },
    });
    steps.push(`已为 ${nullSubWork} 行工作域记录补齐 sub_domain=general。`);
  }

  const nullLabelWork = await table.countRows(
    "domain = 'work' AND sub_domain_label IS NULL",
  );
  if (nullLabelWork > 0) {
    await table.update({
      where: "domain = 'work' AND sub_domain_label IS NULL",
      valuesSql: { sub_domain_label: "''" },
    });
    steps.push(`已为 ${nullLabelWork} 行工作域记录将 sub_domain_label 置为空串。`);
  }

  if (steps.length === 0) {
    steps.push("三列已存在且无待回填的 NULL，无需变更。");
  }

  return { ok: true, steps };
}

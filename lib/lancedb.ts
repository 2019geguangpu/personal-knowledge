import * as lancedb from "@lancedb/lancedb";
import type { AddColumnsSql } from "@lancedb/lancedb";
import { mkdir } from "node:fs/promises";
import { LANCE_TABLE_NAME, RAG_TOP_K } from "@/lib/constants";
import {
  buildVectorWhereClause,
  type KbDomain,
  type KbScope,
} from "@/lib/kb-scope";
import { getVectorDbPath } from "@/lib/env";

export type KbChunkRow = {
  id: string;
  text: string;
  source: string;
  chunk_index: number;
  created_at: string;
  vector: number[];
  domain: KbDomain;
  sub_domain: string;
  sub_domain_label: string;
};

export type GenericChunkRow = {
  id: string;
  text: string;
  source: string;
  chunk_index: number;
  created_at: string;
  vector: number[];
  /** 允许不同业务自定义 domain，如 law */
  domain?: string;
  sub_domain?: string;
  sub_domain_label?: string;
};

export type SearchHit = {
  text: string;
  source: string;
  chunk_index: number;
  domain: KbDomain;
  sub_domain: string;
  sub_domain_label: string;
  distance?: number;
};

export type GenericSearchHit = {
  text: string;
  source: string;
  chunk_index: number;
  domain?: string;
  sub_domain?: string;
  sub_domain_label?: string;
  distance?: number;
};

let connectionPromise: Promise<lancedb.Connection> | null = null;

async function getDb(): Promise<lancedb.Connection> {
  const uri = getVectorDbPath();
  await mkdir(uri, { recursive: true });
  if (!connectionPromise) {
    connectionPromise = lancedb.connect(uri);
  }
  return connectionPromise;
}

async function openTableIfExists(tableName: string) {
  const db = await getDb();
  const tables = await db.tableNames();
  if (!tables.includes(tableName)) {
    return null;
  }
  return db.openTable(tableName);
}

/** 旧版 kb_chunks 无 domain 等列时，在写入前补齐（与 backfill 默认值一致：工作域）。 */
async function ensureKbChunksScopeColumns(table: lancedb.Table): Promise<void> {
  const schema = await table.schema();
  const names = new Set(schema.fields.map((f) => f.name));
  const cols: AddColumnsSql[] = [];
  if (!names.has("domain")) {
    cols.push({ name: "domain", valueSql: "'work'" });
  }
  if (!names.has("sub_domain")) {
    cols.push({ name: "sub_domain", valueSql: "'general'" });
  }
  if (!names.has("sub_domain_label")) {
    cols.push({ name: "sub_domain_label", valueSql: "''" });
  }
  if (cols.length === 0) return;
  await table.addColumns(cols);
}

async function addChunksToTable(
  tableName: string,
  rows: GenericChunkRow[],
): Promise<void> {
  if (rows.length === 0) return;
  const db = await getDb();
  const tables = await db.tableNames();
  if (!tables.includes(tableName)) {
    await db.createTable(tableName, rows as Record<string, unknown>[], {
      mode: "create",
      existOk: false,
    });
    return;
  }
  const table = await db.openTable(tableName);
  if (tableName === LANCE_TABLE_NAME) {
    await ensureKbChunksScopeColumns(table);
  }
  await table.add(rows as Record<string, unknown>[]);
}

async function searchSimilarChunksInTable(
  tableName: string,
  queryVector: number[],
  limit = RAG_TOP_K,
  whereClause?: string,
): Promise<GenericSearchHit[]> {
  const db = await getDb();
  const tables = await db.tableNames();
  if (!tables.includes(tableName)) {
    return [];
  }
  const table = await db.openTable(tableName);

  let raw: Record<string, unknown>[];
  if (whereClause != null && whereClause.trim().length > 0) {
    raw = await table.vectorSearch(queryVector).where(whereClause).limit(limit).toArray();
  } else {
    raw = await table.vectorSearch(queryVector).limit(limit).toArray();
  }

  return raw.map((row: Record<string, unknown>) => {
    const distance =
      typeof row._distance === "number"
        ? row._distance
        : typeof row.distance === "number"
          ? row.distance
          : undefined;
    return {
      text: String(row.text ?? ""),
      source: String(row.source ?? ""),
      chunk_index: Number(row.chunk_index ?? 0),
      domain: row.domain != null ? String(row.domain) : undefined,
      sub_domain: row.sub_domain != null ? String(row.sub_domain) : undefined,
      sub_domain_label:
        row.sub_domain_label != null ? String(row.sub_domain_label) : undefined,
      distance,
    };
  });
}

/** 打开 kb_chunks 表；不存在时返回 null（供迁移等使用） */
export async function openKbChunksTable() {
  return openTableIfExists(LANCE_TABLE_NAME);
}

export async function addKbChunks(rows: KbChunkRow[]): Promise<void> {
  return addChunksToTable(LANCE_TABLE_NAME, rows);
}

export async function searchSimilarChunks(
  queryVector: number[],
  limit = RAG_TOP_K,
  scope?: KbScope,
): Promise<SearchHit[]> {
  if (scope != null) {
    try {
      const hits = await searchSimilarChunksInTable(
        LANCE_TABLE_NAME,
        queryVector,
        limit,
        buildVectorWhereClause(scope),
      );
      return hits.map((h) => ({
        text: h.text,
        source: h.source,
        chunk_index: h.chunk_index,
        domain: h.domain === "game" ? "game" : "work",
        sub_domain: h.sub_domain ?? "",
        sub_domain_label: h.sub_domain_label ?? "",
        distance: h.distance,
      }));
    } catch (err) {
      console.warn(
        "[lancedb] 带 domain 过滤的向量检索失败，回退为全表检索（可能为旧表结构）：",
        err instanceof Error ? err.message : err,
      );
    }
  }

  const hits = await searchSimilarChunksInTable(
    LANCE_TABLE_NAME,
    queryVector,
    limit,
  );
  return hits.map((h) => ({
    text: h.text,
    source: h.source,
    chunk_index: h.chunk_index,
    domain: h.domain === "game" ? "game" : "work",
    sub_domain: h.sub_domain ?? "",
    sub_domain_label: h.sub_domain_label ?? "",
    distance: h.distance,
  }));
}

/** 法律模块独立表：仅提供通用检索与入库，不引入 kb-scope/domain 逻辑 */
export const LAW_TABLE_NAME = "law_chunks";

export type LawChunkRow = GenericChunkRow & {
  domain: "law";
  sub_domain: "doc" | "analysis";
  sub_domain_label: string;
};

export async function addLawChunks(rows: LawChunkRow[]): Promise<void> {
  return addChunksToTable(LAW_TABLE_NAME, rows);
}

export async function searchLawChunks(
  queryVector: number[],
  limit = RAG_TOP_K,
): Promise<GenericSearchHit[]> {
  return searchSimilarChunksInTable(LAW_TABLE_NAME, queryVector, limit);
}

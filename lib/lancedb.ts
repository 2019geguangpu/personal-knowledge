import * as lancedb from "@lancedb/lancedb";
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

export type SearchHit = {
  text: string;
  source: string;
  chunk_index: number;
  domain: KbDomain;
  sub_domain: string;
  sub_domain_label: string;
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

/** 打开 kb_chunks 表；不存在时返回 null（供迁移等使用） */
export async function openKbChunksTable() {
  const db = await getDb();
  const tables = await db.tableNames();
  if (!tables.includes(LANCE_TABLE_NAME)) {
    return null;
  }
  return db.openTable(LANCE_TABLE_NAME);
}

export async function addKbChunks(rows: KbChunkRow[]): Promise<void> {
  if (rows.length === 0) return;
  const db = await getDb();
  const tables = await db.tableNames();
  if (!tables.includes(LANCE_TABLE_NAME)) {
    await db.createTable(LANCE_TABLE_NAME, rows as Record<string, unknown>[], {
      mode: "create",
      existOk: false,
    });
    return;
  }
  const table = await db.openTable(LANCE_TABLE_NAME);
  await table.add(rows as Record<string, unknown>[]);
}

export async function searchSimilarChunks(
  queryVector: number[],
  limit = RAG_TOP_K,
  scope?: KbScope,
): Promise<SearchHit[]> {
  const db = await getDb();
  const tables = await db.tableNames();
  if (!tables.includes(LANCE_TABLE_NAME)) {
    return [];
  }
  const table = await db.openTable(LANCE_TABLE_NAME);
  let raw: Record<string, unknown>[];
  if (scope != null) {
    try {
      raw = await table
        .vectorSearch(queryVector)
        .where(buildVectorWhereClause(scope))
        .limit(limit)
        .toArray();
    } catch (err) {
      console.warn(
        "[lancedb] 带 domain 过滤的向量检索失败，回退为全表检索（可能为旧表结构）：",
        err instanceof Error ? err.message : err,
      );
      raw = await table.vectorSearch(queryVector).limit(limit).toArray();
    }
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
    const domainRaw = row.domain;
    const domain: KbDomain =
      domainRaw === "game" ? "game" : "work";
    return {
      text: String(row.text ?? ""),
      source: String(row.source ?? ""),
      chunk_index: Number(row.chunk_index ?? 0),
      domain,
      sub_domain: String(row.sub_domain ?? ""),
      sub_domain_label: String(row.sub_domain_label ?? ""),
      distance,
    };
  });
}

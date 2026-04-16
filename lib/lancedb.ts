import * as lancedb from "@lancedb/lancedb";
import { mkdir } from "node:fs/promises";
import { LANCE_TABLE_NAME, RAG_TOP_K } from "@/lib/constants";
import { getVectorDbPath } from "@/lib/env";

export type KbChunkRow = {
  id: string;
  text: string;
  source: string;
  chunk_index: number;
  created_at: string;
  vector: number[];
};

export type SearchHit = {
  text: string;
  source: string;
  chunk_index: number;
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
): Promise<SearchHit[]> {
  const db = await getDb();
  const tables = await db.tableNames();
  if (!tables.includes(LANCE_TABLE_NAME)) {
    return [];
  }
  const table = await db.openTable(LANCE_TABLE_NAME);
  const raw = await table.vectorSearch(queryVector).limit(limit).toArray();

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
      distance,
    };
  });
}

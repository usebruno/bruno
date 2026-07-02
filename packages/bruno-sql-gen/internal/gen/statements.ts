import fs from "node:fs";
import path from "node:path";
import type { Config } from "./config";
import type { StatementKind, StatementParam } from "../types";

export interface LoadedStatement {
  name: string;
  kind: StatementKind;
  sql: string;
  params: StatementParam[];
}

interface ColumnMeta {
  type: string;
  notNull: boolean;
  enumValues?: string[];
}

function deriveKind(sql: string): StatementKind {
  return /^\s*(select|with)\b/i.test(sql) ? "read" : "write";
}

function metaFromColumn(column: any): ColumnMeta | null {
  if (!column || typeof column.dataType !== "string") return null;
  const enumValues =
    Array.isArray(column.enumValues) && column.enumValues.length ? column.enumValues.slice() : undefined;
  return { type: column.dataType, notNull: column.notNull ?? true, enumValues };
}

function isPlaceholder(chunk: any): chunk is { name: string } {
  return Boolean(chunk) && chunk.constructor?.name === "Placeholder" && typeof chunk.name === "string";
}

function walkClause(node: any, into: Map<string, ColumnMeta>): void {
  const chunks = node?.queryChunks;
  if (!Array.isArray(chunks)) return;
  let lastColumn: ColumnMeta | null = null;
  for (const chunk of chunks) {
    if (Array.isArray(chunk?.queryChunks)) {
      walkClause(chunk, into);
      continue;
    }
    const column = metaFromColumn(chunk);
    if (column) {
      lastColumn = column;
      continue;
    }
    if (isPlaceholder(chunk) && lastColumn && !into.has(chunk.name)) {
      into.set(chunk.name, lastColumn);
    }
  }
}

function placeholderColumns(query: any): Map<string, ColumnMeta> {
  const map = new Map<string, ColumnMeta>();
  const config = query?.config;
  if (!config) return map;
  const clauses: any[] = [config.where, config.having];
  if (Array.isArray(config.joins)) {
    for (const join of config.joins) clauses.push(join?.on);
  }
  for (const clause of clauses) walkClause(clause, map);
  return map;
}

function toParam(param: any, name: string, columns: Map<string, ColumnMeta>): StatementParam {
  const resolved = metaFromColumn(param?.encoder) ?? columns.get(name) ?? null;
  if (!resolved) {
    console.warn(`[sql-gen] placeholder "${name}" could not be resolved to a column; falling back to z.unknown()`);
    return { name, type: "unknown", notNull: true };
  }
  return { name, type: resolved.type, notNull: resolved.notNull, enumValues: resolved.enumValues };
}

function placeholderName(param: any): string {
  const name = param?.name ?? param?.value?.name;
  if (typeof name !== "string") {
    throw new Error("statement parameter is not a sql.placeholder()");
  }
  return name;
}

async function statementFiles(statementsDir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(statementsDir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();
}

export async function loadStatements(config: Config): Promise<LoadedStatement[]> {
  const statements: LoadedStatement[] = [];
  const seen = new Set<string>();

  for (const file of await statementFiles(config.statementsDir)) {
    const mod = require(file);
    for (const name of Object.keys(mod).sort()) {
      const query = mod[name];
      if (!query || typeof query.toSQL !== "function") continue;
      if (seen.has(name)) throw new Error(`Duplicate statement "${name}" (found again in ${file})`);
      seen.add(name);

      const { sql, params } = query.toSQL();
      const columns = placeholderColumns(query);
      statements.push({
        name,
        kind: deriveKind(sql),
        sql,
        params: (params as unknown[]).map((param) => toParam(param, placeholderName(param), columns))
      });
    }
  }

  return statements.sort((a, b) => a.name.localeCompare(b.name));
}

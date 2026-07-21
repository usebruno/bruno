import type { z } from "zod";

export interface SqliteDb {
  exec(sql: string): void;
  prepare(sql: string): {
    all(...params: unknown[]): any[];
    get(...params: unknown[]): any;
    run(...params: unknown[]): { changes: number | bigint; lastInsertRowid: number | bigint };
  };
}

export type StatementKind = "read" | "write";

export interface Migration {
  idx: number;
  tag: string;
  hash: string;
  statements: string[];
}

export interface GeneratedStatement {
  kind: StatementKind;
  sql: string;
  params: string[];
  input: z.ZodType;
}

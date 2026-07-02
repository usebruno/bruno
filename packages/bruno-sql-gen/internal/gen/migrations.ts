import fs from "node:fs";
import path from "node:path";
import type { Config } from "./config";
import { hashContent } from "./hash";
import type { Journal, Migration } from "../types";

const BREAKPOINT = /-->\s*statement-breakpoint/;

export function loadMigrations(config: Config): Migration[] {
  if (!fs.existsSync(config.journal)) return [];
  const journal: Journal = JSON.parse(fs.readFileSync(config.journal, "utf8"));
  return [...journal.entries]
    .sort((a, b) => a.idx - b.idx)
    .map((entry) => {
      const raw = fs.readFileSync(path.join(config.migrationsDir, `${entry.tag}.sql`), "utf8");
      const statements = raw
        .split(BREAKPOINT)
        .map((statement) => statement.trim())
        .filter(Boolean);
      return { idx: entry.idx, tag: entry.tag, hash: hashContent(raw), statements };
    });
}

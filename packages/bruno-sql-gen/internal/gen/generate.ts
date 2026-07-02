import "tsx/cjs";
import fs from "node:fs";
import path from "node:path";
import { loadConfig, type Config, type Target } from "./config";
import { loadMigrations } from "./migrations";
import { loadStatements, type LoadedStatement } from "./statements";
import {
  emitMigrations,
  emitStatements,
  emitNodeIndex,
  emitWebTypes,
  emitClient,
  emitWebIndex
} from "./emit";
import type { Migration } from "../types";

const TEMPLATES: Record<Target, string[]> = {
  node: ["types.ts", "migrate.ts", "store.ts", "ipc.ts"],
  web: ["SqliteProvider.ts", "useSqlQuery.ts", "useSqlMutation.ts"]
};

function readTemplates(config: Config, target: Target): Record<string, string> {
  const files: Record<string, string> = {};
  for (const name of TEMPLATES[target]) {
    files[name] = fs.readFileSync(path.join(config.templatesDir, target, name), "utf8");
  }
  return files;
}

function nodeFiles(migrations: Migration[], statements: LoadedStatement[], config: Config): Record<string, string> {
  return {
    "migrations.generated.ts": emitMigrations(migrations),
    "statements.generated.ts": emitStatements(statements),
    "index.ts": emitNodeIndex(),
    ...readTemplates(config, "node")
  };
}

function webFiles(statements: LoadedStatement[], config: Config): Record<string, string> {
  return {
    "types.generated.ts": emitWebTypes(statements),
    "client.generated.ts": emitClient(statements),
    "index.ts": emitWebIndex(),
    ...readTemplates(config, "web")
  };
}

async function main(): Promise<void> {
  const config = await loadConfig();
  const migrations = loadMigrations(config);
  const statements = await loadStatements(config);

  for (const { dir, target } of config.outTargets) {
    const files = target === "node" ? nodeFiles(migrations, statements, config) : webFiles(statements, config);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(dir, name), content);
    }
    process.stdout.write(`  ${target} -> ${path.relative(config.cwd, dir)}\n`);
  }

  process.stdout.write(`Generated ${migrations.length} migration(s), ${statements.length} statement(s)\n`);
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});

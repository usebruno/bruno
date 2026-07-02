import type { Migration, StatementParam } from "../types";
import type { LoadedStatement } from "./statements";
import { zodExpr } from "./zod";

function pascalCase(value: string): string {
  return value.replace(/(^|[_\s-]+)([a-zA-Z0-9])/g, (_match, _sep, ch) => ch.toUpperCase());
}

function tsType(param: StatementParam): string {
  let base: string;
  if (param.enumValues && param.enumValues.length) {
    base = param.enumValues.map((value) => JSON.stringify(value)).join(" | ");
  } else {
    switch (param.type) {
      case "number":
        base = "number";
        break;
      case "string":
        base = "string";
        break;
      case "bigint":
        base = "bigint";
        break;
      case "boolean":
        base = "boolean";
        break;
      case "date":
        base = "number | Date | string";
        break;
      default:
        base = "unknown";
    }
  }
  return param.notNull ? base : `${base} | null`;
}

export function emitMigrations(migrations: Migration[]): string {
  return (
    `import type { Migration } from "./types";\n\n` +
    `export const migrations: Migration[] = ${JSON.stringify(migrations, null, 2)};\n`
  );
}

function emitInput(statement: LoadedStatement): string {
  if (statement.params.length === 0) return "z.object({})";
  const fields = statement.params
    .map((param) => `    ${JSON.stringify(param.name)}: ${zodExpr(param)}`)
    .join(",\n");
  return `z.object({\n${fields}\n  })`;
}

export function emitStatements(statements: LoadedStatement[]): string {
  const body = statements
    .map((statement) =>
      [
        `  ${JSON.stringify(statement.name)}: {`,
        `    kind: ${JSON.stringify(statement.kind)},`,
        `    sql: ${JSON.stringify(statement.sql)},`,
        `    params: ${JSON.stringify(statement.params.map((param) => param.name))},`,
        `    input: ${emitInput(statement)}`,
        `  }`
      ].join("\n")
    )
    .join(",\n");
  const declaration = statements.length
    ? `export const statements = {\n${body}\n} satisfies Record<string, GeneratedStatement>;\n\n` +
      `export type StatementName = keyof typeof statements;\n`
    : `export const statements: Record<string, GeneratedStatement> = {};\n\n` + `export type StatementName = string;\n`;
  return `import { z } from "zod";\n` + `import type { GeneratedStatement } from "./types";\n\n` + declaration;
}

export function emitNodeIndex(): string {
  return (
    `export * from "./types";\n` +
    `export { migrations } from "./migrations.generated";\n` +
    `export { statements, type StatementName } from "./statements.generated";\n` +
    `export { migrate } from "./migrate";\n` +
    `export { createStore, type Store } from "./store";\n` +
    `export { registerHandlers, type IpcMainLike } from "./ipc";\n`
  );
}

export function emitWebTypes(statements: LoadedStatement[]): string {
  const interfaces = statements.map((statement) => {
    const fields = statement.params.map((param) => `  ${param.name}: ${tsType(param)};`).join("\n");
    return `export interface ${pascalCase(statement.name)}Input {\n${fields}\n}`;
  });
  interfaces.push(`export interface RunResult {\n  changes: number | bigint;\n  lastInsertRowid: number | bigint;\n}`);
  return `${interfaces.join("\n\n")}\n`;
}

export function emitClient(statements: LoadedStatement[]): string {
  const inputTypes = statements.map((statement) => `${pascalCase(statement.name)}Input`);
  const methods = statements
    .map((statement) => {
      const result = statement.kind === "read" ? "unknown[]" : "RunResult";
      return `    ${statement.name}: (input: ${pascalCase(statement.name)}Input) => invoke("db:exec", { name: ${JSON.stringify(
        statement.name
      )}, input }) as Promise<${result}>`;
    })
    .join(",\n");
  return (
    `import type { ${[...inputTypes, "RunResult"].join(", ")} } from "./types.generated";\n\n` +
    `export type Invoke = (channel: string, payload: unknown) => Promise<unknown>;\n\n` +
    `export function createClient(invoke: Invoke) {\n  return {\n${methods}\n  };\n}\n`
  );
}

export function emitWebIndex(): string {
  return (
    `export * from "./types.generated";\n` +
    `export { createClient, type Invoke } from "./client.generated";\n` +
    `export { SqliteProvider, useSqlClient, type SqliteClient } from "./SqliteProvider";\n` +
    `export { useSqlQuery, type QueryState } from "./useSqlQuery";\n` +
    `export { useSqlMutation, type MutationState } from "./useSqlMutation";\n`
  );
}

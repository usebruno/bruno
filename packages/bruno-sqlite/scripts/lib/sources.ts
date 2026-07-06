import * as path from "path"
import * as fs from "fs"
import type { Migration, StatementDef, StatementType } from "../../src/shared/types"

const { Parser } = require("node-sql-parser")
const sqlParser = new Parser()

const extractTables = (sql: string): string[] => {
  try {
    const list: string[] = sqlParser.tableList(sql, { database: "Sqlite" })
    return [...new Set(list.map((entry) => entry.split("::")[2]).filter(Boolean))]
  } catch {
    return []
  }
}

const ROOT_DIR = process.cwd()
const MIGRATIONS_DIR = path.join(ROOT_DIR, "migrations")
const STATEMENTS_DIR = path.join(ROOT_DIR, "statements")
const STATEMENT_TYPES: StatementType[] = ["run", "get", "all"]

const parseSequence = (fileName: string): number => {
  const prefix = fileName.split("_")[0]
  const sequence = Number(prefix)
  if (prefix === "" || Number.isNaN(sequence)) {
    throw new Error(`Migration "${fileName}" is missing a numeric sequence prefix.`)
  }
  return sequence
}

const commentBody = (line: string): string => {
  const trimmed = line.trim()
  if (!trimmed.startsWith("--")) return ""
  return trimmed.slice(2).trim().toUpperCase()
}

const parseMigration = (fileName: string, content: string): Migration => {
  const lines = content.split("\n")
  const upIdx = lines.findIndex(line => commentBody(line).startsWith("UP"))
  const downIdx = lines.findIndex(line => commentBody(line).startsWith("DOWN"))
  if (upIdx === -1 || downIdx === -1 || downIdx < upIdx) {
    throw new Error(`Migration "${fileName}" must contain a "-- UP" section followed by a "-- DOWN" section.`)
  }
  return {
    sequence: parseSequence(fileName),
    name: path.basename(fileName, ".sql"),
    up: lines.slice(upIdx + 1, downIdx).join("\n").trim(),
    down: lines.slice(downIdx + 1).join("\n").trim()
  }
}

export const loadMigrations = (): Migration[] => {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile() && path.extname(entry.name) === ".sql")
    .map(entry => parseMigration(entry.name, fs.readFileSync(path.join(MIGRATIONS_DIR, entry.name), "utf8")))
    .sort((a, b) => a.sequence - b.sequence)
}

const walkSql = (dir: string): string[] => {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return walkSql(full)
    return entry.isFile() && entry.name.endsWith(".sql") ? [full] : []
  })
}

const parseStatement = (fullPath: string): StatementDef => {
  const relative = path.relative(STATEMENTS_DIR, fullPath)
  const parts = path.basename(relative).split(".")
  const type = parts[parts.length - 2] as StatementType
  if (parts.length < 3 || parts[parts.length - 1] !== "sql" || !STATEMENT_TYPES.includes(type)) {
    throw new Error(`Statement "${relative}" must be named "{name}.{${STATEMENT_TYPES.join("|")}}.sql".`)
  }
  const base = parts.slice(0, -2).join(".")
  const dir = path.dirname(relative)
  const name = dir === "." ? base : `${dir.split(path.sep).join("/")}/${base}`
  const sql = fs.readFileSync(fullPath, "utf8").trim()
  return {
    name,
    type,
    sql,
    tables: extractTables(sql)
  }
}

export const loadStatements = (): StatementDef[] => {
  if (!fs.existsSync(STATEMENTS_DIR)) return []
  return walkSql(STATEMENTS_DIR)
    .map(parseStatement)
    .sort((a, b) => a.name.localeCompare(b.name))
}

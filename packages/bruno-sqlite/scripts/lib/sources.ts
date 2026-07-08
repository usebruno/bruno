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

// sqlc-style query annotation: `-- name: <Name> :one|:many|:exec`
const SQLC_NAME_ANNOTATION = /^--\s*name:\s*(\S+)\s+:(\w+)\s*$/

const SQLC_COMMAND_TYPES: Record<string, StatementType> = {
  one: "get",
  many: "all",
  exec: "run",
  execrows: "run",
  execresult: "run",
  execlastid: "run"
}

const parseStatementFile = (relative: string, content: string): StatementDef[] => {
  const defs: StatementDef[] = []
  let current: { name: string; type: StatementType; body: string[] } | null = null

  const flush = () => {
    if (current === null) return
    const sql = current.body.join("\n").trim()
    if (sql === "") {
      throw new Error(`Statement "${current.name}" in ${relative} has no SQL body.`)
    }
    defs.push({ name: current.name, type: current.type, sql, tables: extractTables(sql) })
  }

  for (const line of content.split("\n")) {
    const match = line.match(SQLC_NAME_ANNOTATION)
    if (match) {
      flush()
      const [, name, command] = match
      const type = SQLC_COMMAND_TYPES[command.toLowerCase()]
      if (type === undefined) {
        throw new Error(`Statement "${name}" in ${relative} uses unsupported command ":${command}". Use :one, :many, or :exec.`)
      }
      current = { name, type, body: [] }
    } else if (current !== null) {
      current.body.push(line)
    }
  }
  flush()
  return defs
}

export const loadStatements = (): StatementDef[] => {
  if (!fs.existsSync(STATEMENTS_DIR)) return []
  const defs = walkSql(STATEMENTS_DIR).flatMap((full) =>
    parseStatementFile(path.relative(STATEMENTS_DIR, full), fs.readFileSync(full, "utf8"))
  )
  const seen = new Set<string>()
  for (const def of defs) {
    if (seen.has(def.name)) {
      throw new Error(`Duplicate statement name "${def.name}".`)
    }
    seen.add(def.name)
  }
  return defs.sort((a, b) => a.name.localeCompare(b.name))
}

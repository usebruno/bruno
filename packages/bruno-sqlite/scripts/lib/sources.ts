import * as path from "path"
import * as fs from "fs"
import type { Migration, StatementDef, StatementType } from "../../src/shared/types"

const { Parser } = require("node-sql-parser")
const sqlParser = new Parser()

const extractTables = (sql: string): string[] => {
  try {
    let list: string[] = sqlParser.tableList(sql, { database: "Sqlite" })
    // This is in the form of statement::db::table, hence the second index access
    return Array.from(list.map(entry => entry.split("::")[2]))
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

const parseMigration = (parentPath: string, name: string): Migration => {
  const filePath = path.join(parentPath, name)
  const { up, down } = require(filePath)
  if (up === undefined || down === undefined) throw new Error(`Migration ${name} should export up and down methods`)

  const upStatement = typeof up === 'function' ? up() : up;
  const downStatement = typeof down === 'function' ? down() : down;

  if (typeof upStatement !== 'string') throw new Error('up should be a string or a function returning a string')
  if (typeof downStatement !== 'string') throw new Error('down should be a string or a function returning a string')

  return {
    sequence: parseSequence(name),
    name: path.basename(name, ".ts"),
    up: upStatement,
    down: downStatement
  }
}

export const loadMigrations = (): Migration[] => {
  if (!fs.existsSync(MIGRATIONS_DIR)) return []
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter(entry => entry.isFile() && path.extname(entry.name) === ".ts")
    .map(entry => parseMigration(entry.parentPath, entry.name))
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
  one: "one",
  many: "many",
  exec: "exec",
  execrows: "exec",
  execresult: "exec",
  execlastid: "exec"
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

  content.split("\n").forEach((line) => {
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
  })
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

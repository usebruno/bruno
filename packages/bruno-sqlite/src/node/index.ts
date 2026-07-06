import { DB } from "./db"
import type { DatabaseOptions } from "./db"
import { Statements } from "./statements"
import { migrations } from "../generated/node/migrations"

export { DB } from "./db"
export type { DatabaseOptions } from "./db"
export { Statements } from "./statements"
export { registerSQLiteIpc } from "./ipc"
export type { IpcMainLike } from "./ipc"
export * from "../shared"

export const version = '0.1.0'

export const createDatabase = (path: string, options: DatabaseOptions = {}) => {
  const db = new DB(path, migrations, options)
  if (db._db === undefined) {
    throw new Error("Failed to open the database.")
  }
  const statements = new Statements(db._db)
  return { db, statements }
}

import type { DatabaseSync, StatementSync, SupportedValueType } from "node:sqlite"
import type { StatementDef } from "../shared/types"
import type { SQLiteMutationEvent, SQLiteParams } from "../shared/ipc"
import { statements as statementDefs } from "../generated/node/statements"

export type OnMutation = (event: SQLiteMutationEvent) => void

export class Statements {
  _prepared: Map<string, StatementSync> = new Map()
  _defs: Map<string, StatementDef> = new Map()
  _onMutation?: OnMutation

  constructor(db: DatabaseSync, onMutation?: OnMutation) {
    this._onMutation = onMutation
    for (const def of statementDefs) {
      this._defs.set(def.name, def)
      this._prepared.set(def.name, db.prepare(def.sql))
    }
  }

  execute(name: string, params: SQLiteParams = {}): unknown {
    const stmt = this._prepared.get(name)
    const def = this._defs.get(name)
    if (stmt === undefined || def === undefined) {
      throw new Error(`Unknown statement: "${name}"`)
    }
    const args = params as Record<string, SupportedValueType>
    switch (def.type) {
      case 'exec': {
        const result = stmt.run(args)
        this._onMutation?.({ name: def.name, tables: def.tables })
        return result
      }
      case 'one':
        return stmt.get(args)
      case 'many':
        return stmt.all(args)
    }
  }
}

import type { DatabaseSync, StatementSync, SupportedValueType } from "node:sqlite"
import type { StatementDef } from "../shared/types"
import { statements as statementDefs } from "../generated/node/statements"

export class Statements {
  _prepared: Map<string, StatementSync> = new Map()
  _defs: Map<string, StatementDef> = new Map()

  constructor(db: DatabaseSync) {
    for (const def of statementDefs) {
      this._defs.set(def.name, def)
      this._prepared.set(def.name, db.prepare(def.sql))
    }
  }

  execute(name: string, params: unknown[] = []): unknown {
    const stmt = this._prepared.get(name)
    const def = this._defs.get(name)
    if (stmt === undefined || def === undefined) {
      throw new Error(`Unknown statement: "${name}"`)
    }
    const args = params as SupportedValueType[]
    switch (def.type) {
      case 'run':
        return stmt.run(...args)
      case 'get':
        return stmt.get(...args)
      case 'all':
        return stmt.all(...args)
    }
  }
}

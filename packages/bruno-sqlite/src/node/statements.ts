import type { DatabaseSync, StatementSync, SupportedValueType } from 'node:sqlite';
import type { SQLiteParams, StatementDef } from '../shared/types';
import { statements as statementDefs } from '../generated/node/statements';

export class Statements {
  _prepared: Map<string, StatementSync> = new Map();
  _defs: Map<string, StatementDef> = new Map();

  constructor(db: DatabaseSync) {
    for (const def of statementDefs) {
      this._defs.set(def.name, def);
      try {
        const prepared = db.prepare(def.sql);
        if (def.readBigInts) prepared.setReadBigInts(true);
        this._prepared.set(def.name, prepared);
      } catch (err) {
        console.error(`failed to prepare the statement "${def.name}": `, err);
      }
    }
  }

  execute(name: string, params: SQLiteParams = {}): unknown {
    const def = this._defs.get(name);
    if (def === undefined) {
      throw new Error(`Unknown statement: "${name}"`);
    }
    const stmt = this._prepared.get(name);
    if (stmt === undefined) {
      throw new Error(`Statement "${name}" could not be prepared against this database`);
    }
    const args = params as Record<string, SupportedValueType>;
    switch (def.type) {
      case 'exec':
        return stmt.run(args);
      case 'one':
        return stmt.get(args);
      case 'many':
        return stmt.all(args);
      default:
        throw new Error(`unknown definition type: ${def.type}`);
    }
  }
}

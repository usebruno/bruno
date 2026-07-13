export type StatementType = 'one' | 'many' | 'exec'

export type Migration = {
  sequence: number
  name: string
  up: string
  down: string
}

export type StatementDef = {
  name: string
  type: StatementType
  sql: string
  tables: string[]
}

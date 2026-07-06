export type StatementType = 'run' | 'get' | 'all'

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
}

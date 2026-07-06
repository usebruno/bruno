export const SQLITE_CHANNEL = 'usebruno:sqlite'
export const SQLITE_MUTATION_CHANNEL = 'usebruno:sqlite:mutation'
export const SQLITE_QUERY_KEY = 'sqlite'

export type SQLiteRequest = {
  name: string
  params?: unknown[]
}

export type SQLiteMutationEvent = {
  name: string
  tables: string[]
}

export interface SQLiteBridge {
  invoke(channel: string, request: SQLiteRequest): Promise<unknown>
  on?(channel: string, handler: (event: SQLiteMutationEvent) => void): () => void
}

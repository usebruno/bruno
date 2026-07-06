export const SQLITE_CHANNEL = 'usebruno:sqlite'

export type SQLiteRequest = {
  name: string
  params?: unknown[]
}

export interface SQLiteBridge {
  invoke(channel: string, request: SQLiteRequest): Promise<unknown>
}

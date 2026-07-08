import type { Statements } from "./statements"
import type { SQLiteRequest } from "../shared/ipc"
import { SQLITE_CHANNEL } from "../shared/ipc"

export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, request: SQLiteRequest) => unknown): void
}

export const registerSQLiteIpc = (ipcMain: IpcMainLike, statements: Statements): void => {
  ipcMain.handle(SQLITE_CHANNEL, (_event, request) => {
    return statements.execute(request.name, request.params ?? {})
  })
}

import type { SqliteDb } from "./types";
import { createStore } from "./store";

export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, payload: any) => unknown): void;
}

export function registerHandlers(db: SqliteDb, ipcMain: IpcMainLike): void {
  const store = createStore(db);
  ipcMain.handle("db:exec", (_event, payload: { name: any; input?: unknown }) => store.run(payload.name, payload.input));
}

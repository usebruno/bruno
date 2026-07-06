import React, { createContext, useContext } from "react"
import type { SQLiteBridge } from "../shared/ipc"

const SQLiteContext = createContext<SQLiteBridge | null>(null)

export type SQLiteProviderProps = {
  bridge: SQLiteBridge
  children: React.ReactNode
}

export const SQLiteProvider = ({ bridge, children }: SQLiteProviderProps) => {
  return <SQLiteContext.Provider value={bridge}>{children}</SQLiteContext.Provider>
}

export const useSQLiteBridge = (): SQLiteBridge => {
  const bridge = useContext(SQLiteContext)
  if (bridge === null) {
    throw new Error("useSQLite must be used within a <SQLiteProvider>")
  }
  return bridge
}

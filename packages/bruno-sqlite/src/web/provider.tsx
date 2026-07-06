import React, { createContext, useContext, useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { SQLiteBridge } from "../shared/ipc"

const SQLiteContext = createContext<SQLiteBridge | null>(null)

export type SQLiteProviderProps = {
  bridge: SQLiteBridge
  client?: QueryClient
  children: React.ReactNode
}

export const SQLiteProvider = ({ bridge, client, children }: SQLiteProviderProps) => {
  const [queryClient] = useState(() => client ?? new QueryClient())
  return (
    <SQLiteContext.Provider value={bridge}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SQLiteContext.Provider>
  )
}

export const useSQLiteBridge = (): SQLiteBridge => {
  const bridge = useContext(SQLiteContext)
  if (bridge === null) {
    throw new Error("useSqliteQuery/useSqliteMutation must be used within a <SQLiteProvider>")
  }
  return bridge
}

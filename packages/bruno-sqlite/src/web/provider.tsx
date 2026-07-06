import React, { createContext, useContext, useEffect, useState } from "react"
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import type { SQLiteBridge } from "../shared/ipc"
import { SQLITE_MUTATION_CHANNEL } from "../shared/ipc"
import { intersectsTablesPredicate } from "./tables"

const SQLiteContext = createContext<SQLiteBridge | null>(null)

export type SQLiteProviderProps = {
  bridge: SQLiteBridge
  client?: QueryClient
  children: React.ReactNode
}

// Listens for main-process mutation broadcasts and invalidates any read query
// whose tables intersect the changed tables. Rendered inside QueryClientProvider.
const SqliteInvalidator = ({ bridge }: { bridge: SQLiteBridge }) => {
  const queryClient = useQueryClient()
  useEffect(() => {
    if (typeof bridge.on !== "function") return
    return bridge.on(SQLITE_MUTATION_CHANNEL, (event) => {
      const tables = event?.tables ?? []
      if (tables.length === 0) return
      queryClient.invalidateQueries({ predicate: intersectsTablesPredicate(tables) })
    })
  }, [bridge, queryClient])
  return null
}

export const SQLiteProvider = ({ bridge, client, children }: SQLiteProviderProps) => {
  const [queryClient] = useState(() => client ?? new QueryClient())
  return (
    <SQLiteContext.Provider value={bridge}>
      <QueryClientProvider client={queryClient}>
        <SqliteInvalidator bridge={bridge} />
        {children}
      </QueryClientProvider>
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

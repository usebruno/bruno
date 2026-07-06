import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query"
import { useSQLiteBridge } from "./provider"
import { SQLITE_CHANNEL } from "../shared/ipc"
import { statementTypes, statementTables } from "../generated/web/statements"

export const SQLITE_QUERY_KEY = "sqlite"

const tablesFor = (name: string): readonly string[] => statementTables[name] ?? []

type StatementTypeMap = typeof statementTypes
type ReadStatementName = {
  [K in keyof StatementTypeMap]: StatementTypeMap[K] extends "get" | "all" ? K : never
}[keyof StatementTypeMap]
type WriteStatementName = {
  [K in keyof StatementTypeMap]: StatementTypeMap[K] extends "run" ? K : never
}[keyof StatementTypeMap]

export const useSqliteQuery = <TData = unknown>(
  name: ReadStatementName,
  params: unknown[] = [],
  options?: Omit<UseQueryOptions<TData, Error, TData>, "queryKey" | "queryFn">
) => {
  const bridge = useSQLiteBridge()
  return useQuery<TData, Error, TData>({
    queryKey: [SQLITE_QUERY_KEY, name, params],
    queryFn: () => bridge.invoke(SQLITE_CHANNEL, { name, params }) as Promise<TData>,
    ...options
  })
}

export type SqliteMutationOptions<TData> = Omit<UseMutationOptions<TData, Error, unknown[]>, "mutationFn"> & {
  invalidates?: ReadStatementName[]
}

export const useSqliteMutation = <TData = unknown>(
  name: WriteStatementName,
  options?: SqliteMutationOptions<TData>
) => {
  const bridge = useSQLiteBridge()
  const queryClient = useQueryClient()
  const { onSuccess, invalidates, ...rest } = options ?? {}
  const writeTables = tablesFor(name)
  return useMutation<TData, Error, unknown[]>({
    mutationFn: (params: unknown[] = []) => bridge.invoke(SQLITE_CHANNEL, { name, params }) as Promise<TData>,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey
          if (!Array.isArray(key) || key[0] !== SQLITE_QUERY_KEY) return false
          const readTables = tablesFor(String(key[1]))
          return writeTables.some((table) => readTables.includes(table))
        }
      })
      for (const readName of invalidates ?? []) {
        queryClient.invalidateQueries({ queryKey: [SQLITE_QUERY_KEY, readName] })
      }
      onSuccess?.(...args)
    },
    ...rest
  })
}

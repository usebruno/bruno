import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query"
import { useSQLiteBridge } from "./provider"
import { SQLITE_CHANNEL, SQLITE_QUERY_KEY } from "../shared/ipc"
import type { SQLiteParams } from "../shared/ipc"
import { statementTypes } from "../generated/web/statements"
import { tablesFor, intersectsTablesPredicate } from "./tables"

type StatementTypeMap = typeof statementTypes
type ReadStatementName = {
  [K in keyof StatementTypeMap]: StatementTypeMap[K] extends "get" | "all" ? K : never
}[keyof StatementTypeMap]
type WriteStatementName = {
  [K in keyof StatementTypeMap]: StatementTypeMap[K] extends "run" ? K : never
}[keyof StatementTypeMap]

export const useSqliteQuery = <TData = unknown>(
  name: ReadStatementName,
  params: SQLiteParams = {},
  options?: Omit<UseQueryOptions<TData, Error, TData>, "queryKey" | "queryFn">
) => {
  const bridge = useSQLiteBridge()
  return useQuery<TData, Error, TData>({
    queryKey: [SQLITE_QUERY_KEY, name, params],
    queryFn: () => bridge.invoke(SQLITE_CHANNEL, { name, params }) as Promise<TData>,
    ...options
  })
}

export type SqliteMutationOptions<TData> = Omit<UseMutationOptions<TData, Error, SQLiteParams>, "mutationFn"> & {
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
  return useMutation<TData, Error, SQLiteParams>({
    mutationFn: (params: SQLiteParams = {}) => bridge.invoke(SQLITE_CHANNEL, { name, params }) as Promise<TData>,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ predicate: intersectsTablesPredicate(writeTables) })
      for (const readName of invalidates ?? []) {
        queryClient.invalidateQueries({ queryKey: [SQLITE_QUERY_KEY, readName] })
      }
      onSuccess?.(...args)
    },
    ...rest
  })
}

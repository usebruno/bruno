import { useQuery, useMutation } from "@tanstack/react-query"
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query"
import { useSQLiteBridge } from "./provider"
import { SQLITE_CHANNEL, SQLITE_QUERY_KEY } from "../shared/ipc"
import type { SQLiteParams } from "../shared/ipc"
import { statementTypes } from "../generated/web/statements"

type StatementTypeMap = typeof statementTypes
type ReadStatementName = {
  [K in keyof StatementTypeMap]: StatementTypeMap[K] extends "one" | "many" ? K : never
}[keyof StatementTypeMap]
type WriteStatementName = {
  [K in keyof StatementTypeMap]: StatementTypeMap[K] extends "exec" ? K : never
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

export type SqliteMutationOptions<TData> = Omit<UseMutationOptions<TData, Error, SQLiteParams>, "mutationFn">

export const useSqliteMutation = <TData = unknown>(
  name: WriteStatementName,
  options?: SqliteMutationOptions<TData>
) => {
  const bridge = useSQLiteBridge()
  return useMutation<TData, Error, SQLiteParams>({
    mutationFn: (params: SQLiteParams = {}) => bridge.invoke(SQLITE_CHANNEL, { name, params }) as Promise<TData>,
    ...options
  })
}

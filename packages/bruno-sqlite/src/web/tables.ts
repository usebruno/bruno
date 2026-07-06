import { statementTables } from "../generated/web/statements"
import { SQLITE_QUERY_KEY } from "../shared/ipc"

export const tablesFor = (name: string): readonly string[] => statementTables[name] ?? []

// Predicate for queryClient.invalidateQueries: matches any sqlite read query whose
// tables intersect the given changed tables.
export const intersectsTablesPredicate = (changedTables: readonly string[]) => {
  return (query: { queryKey: readonly unknown[] }): boolean => {
    const key = query.queryKey
    if (!Array.isArray(key) || key[0] !== SQLITE_QUERY_KEY) return false
    const readTables = tablesFor(String(key[1]))
    return changedTables.some((table) => readTables.includes(table))
  }
}

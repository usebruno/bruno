import { statementTables } from "../generated/web/statements"
import { SQLITE_QUERY_KEY } from "../shared/ipc"

const tablesFor = (name: string): readonly string[] => statementTables[name] ?? []

export const intersectsTablesPredicate = (changedTables: readonly string[]) => {
  const changed = new Set(changedTables)
  return ({ queryKey }: { queryKey: readonly unknown[] }): boolean =>
    queryKey[0] === SQLITE_QUERY_KEY && tablesFor(String(queryKey[1])).some((table) => changed.has(table))
}

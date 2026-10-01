import { statementTables } from '../generated/web/statements';
import { SQLITE_QUERY_KEY } from '../shared/ipc';
import { FILES_TABLE, SQLITE_FILE_QUERY_KEY } from '../shared/files';

const tablesFor = (name: string): readonly string[] => statementTables[name] ?? [];

export const intersectsTablesPredicate = (changedTables: readonly string[]) => {
  const changed = new Set(changedTables);
  return ({ queryKey }: { queryKey: readonly unknown[] }): boolean => {
    if (queryKey[0] !== SQLITE_QUERY_KEY) return false;
    if (queryKey[1] === SQLITE_FILE_QUERY_KEY) return changed.has(FILES_TABLE);
    return tablesFor(String(queryKey[1])).some((table) => changed.has(table));
  };
};

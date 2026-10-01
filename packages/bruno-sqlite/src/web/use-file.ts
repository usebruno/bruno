import { useMemo } from 'react';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { useSQLiteBridge } from './provider';
import { createFileClient, type FileClient } from './files';
import { SQLITE_QUERY_KEY } from '../shared/ipc';
import { SQLITE_FILE_QUERY_KEY, type FileEntry, type FileRange } from '../shared/files';

type ReadOptions<TData> = Omit<UseQueryOptions<TData, Error, TData>, 'queryKey' | 'queryFn'>;

export const sqliteFileQueryKey = (op: string, id: number | null | undefined, range?: FileRange): unknown[] => [
  SQLITE_QUERY_KEY,
  SQLITE_FILE_QUERY_KEY,
  op,
  id ?? null,
  range ?? null
];

export const enabledForId = <TData>(
  id: number | null | undefined,
  options?: ReadOptions<TData>
): ReadOptions<TData>['enabled'] => {
  if (id === null || id === undefined) return false;
  return options?.enabled ?? true;
};

export const useSqliteFileClient = (): FileClient => {
  const bridge = useSQLiteBridge();
  return useMemo(() => createFileClient(bridge), [bridge]);
};

export const useSqliteFile = (id: number | null | undefined, options?: ReadOptions<FileEntry | null>) => {
  const client = useSqliteFileClient();
  return useQuery<FileEntry | null, Error, FileEntry | null>({
    queryKey: sqliteFileQueryKey('stat', id),
    queryFn: () => client.stat(id as number),
    ...options,
    enabled: enabledForId(id, options)
  });
};

export const useSqliteFileBytes = (
  id: number | null | undefined,
  range?: FileRange,
  options?: ReadOptions<Uint8Array | null>
) => {
  const client = useSqliteFileClient();
  return useQuery<Uint8Array | null, Error, Uint8Array | null>({
    queryKey: sqliteFileQueryKey('read', id, range),
    queryFn: () => client.read(id as number, range),
    ...options,
    enabled: enabledForId(id, options)
  });
};

export const useSqliteFileText = (
  id: number | null | undefined,
  range?: FileRange,
  options?: ReadOptions<string | null>
) => {
  const client = useSqliteFileClient();
  return useQuery<string | null, Error, string | null>({
    queryKey: sqliteFileQueryKey('readText', id, range),
    queryFn: () => client.readText(id as number, range),
    ...options,
    enabled: enabledForId(id, options)
  });
};

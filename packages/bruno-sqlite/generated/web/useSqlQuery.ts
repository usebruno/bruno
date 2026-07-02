import { useCallback, useEffect, useState } from "react";
import { useSqlClient, type SqliteClient } from "./SqliteProvider";

export interface QueryState<T> {
  data?: T;
  loading: boolean;
  error?: unknown;
}

export function useSqlQuery<T>(
  select: (client: SqliteClient) => Promise<T>,
  deps: unknown[] = []
): QueryState<T> & { refetch: () => void } {
  const client = useSqlClient();
  const [state, setState] = useState<QueryState<T>>({ loading: true });

  const refetch = useCallback(() => {
    setState((current) => ({ ...current, loading: true }));
    select(client)
      .then((data) => setState({ data, loading: false }))
      .catch((error) => setState({ loading: false, error }));
  }, [client, ...deps]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { ...state, refetch };
}

import { useCallback, useState } from "react";
import { useSqlClient, type SqliteClient } from "./SqliteProvider";

export interface MutationState<T> {
  data?: T;
  loading: boolean;
  error?: unknown;
}

export function useSqlMutation<A, T>(
  select: (client: SqliteClient) => (args: A) => Promise<T>
): [(args: A) => Promise<T>, MutationState<T>] {
  const client = useSqlClient();
  const [state, setState] = useState<MutationState<T>>({ loading: false });

  const mutate = useCallback(
    async (args: A) => {
      setState({ loading: true });
      try {
        const data = await select(client)(args);
        setState({ data, loading: false });
        return data;
      } catch (error) {
        setState({ loading: false, error });
        throw error;
      }
    },
    [client]
  );

  return [mutate, state];
}

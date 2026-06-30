import { createContext, createElement, useContext, useMemo, type ReactNode } from "react";
import { createClient, type Invoke } from "./client.generated";

export type SqliteClient = ReturnType<typeof createClient>;

const SqliteContext = createContext<SqliteClient | null>(null);

export function SqliteProvider(props: { invoke: Invoke; children: ReactNode }) {
  const client = useMemo(() => createClient(props.invoke), [props.invoke]);
  return createElement(SqliteContext.Provider, { value: client }, props.children);
}

export function useSqlClient(): SqliteClient {
  const client = useContext(SqliteContext);
  if (!client) {
    throw new Error("useSqlClient must be used within a <SqliteProvider>");
  }
  return client;
}

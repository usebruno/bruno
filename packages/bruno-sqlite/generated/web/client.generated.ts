import type { RunResult } from "./types.generated";

export type Invoke = (channel: string, payload: unknown) => Promise<unknown>;

export function createClient(invoke: Invoke) {
  return {

  };
}

import { useSQLiteBridge } from "./provider"
import { SQLITE_CHANNEL } from "../shared/ipc"
import type { StatementName } from "../generated/web/statements"

export const useSQLite = () => {
  const bridge = useSQLiteBridge()
  return {
    query: (name: StatementName, ...params: unknown[]): Promise<unknown> => {
      return bridge.invoke(SQLITE_CHANNEL, { name, params })
    }
  }
}

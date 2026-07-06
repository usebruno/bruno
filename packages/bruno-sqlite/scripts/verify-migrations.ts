import { DB } from "../src/node/db"
import type { Migration } from "../src/shared/types"
import { loadMigrations } from "./lib/sources"

const main = () => {
  let migrations: Migration[]
  try {
    migrations = loadMigrations()
  } catch (err) {
    console.error(`Failed to load migrations: ${(err as Error).message}`)
    process.exit(1)
  }

  if (migrations.length === 0) {
    console.log("No migrations to verify.")
    return
  }

  try {
    const db = new DB(":memory:", migrations)
    db.close()
  } catch (err) {
    console.error(`Migration verification failed: ${(err as Error).message}`)
    process.exit(1)
  }

  console.log(`Verified ${migrations.length} migration(s): all statements applied cleanly.`)
}

main()

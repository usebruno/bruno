import * as path from "path"
import * as fs from "fs"
import { loadMigrations, loadStatements } from "./lib/sources"

const GENERATED_DIR = path.join(process.cwd(), "src", "generated")
const NODE_DIR = path.join(GENERATED_DIR, "node")
const WEB_DIR = path.join(GENERATED_DIR, "web")

const BANNER = "// GENERATED FILE - DO NOT EDIT. Run `npm run generate`."

const writeFile = (file: string, content: string): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

const main = () => {
  const migrations = loadMigrations()
  const statements = loadStatements()

  writeFile(
    path.join(NODE_DIR, "migrations.ts"),
    `${BANNER}\nimport type { Migration } from "../../shared/types"\n\nexport const migrations: Migration[] = ${JSON.stringify(migrations, null, 2)}\n`
  )

  writeFile(
    path.join(NODE_DIR, "statements.ts"),
    `${BANNER}\nimport type { StatementDef } from "../../shared/types"\n\nexport const statements: StatementDef[] = ${JSON.stringify(statements, null, 2)}\n`
  )

  const typeMap: Record<string, string> = {}
  for (const statement of statements) {
    typeMap[statement.name] = statement.type
  }
  const statementName = statements.length > 0 ? "keyof typeof statementTypes" : "string"
  writeFile(
    path.join(WEB_DIR, "statements.ts"),
    `${BANNER}\n\nexport const statementTypes = ${JSON.stringify(typeMap, null, 2)} as const\n\nexport type StatementName = ${statementName}\n`
  )

  console.log(`Generated ${migrations.length} migration(s) and ${statements.length} statement(s).`)
}

main()

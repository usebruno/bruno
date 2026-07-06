import * as path from "path"
import * as fs from "fs"
import { createInterface, Interface } from "readline/promises"

const STATEMENTS_DIR = path.join(process.cwd(), "statements")
const TYPES = ["run", "get", "all"]

const getEmptyFileTemplate = (name: string, type: string): string => {
  return `-- ${name} (${type})\n-- Write your statement here`
}

const sanitizeName = (raw: string): string => {
  return raw.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
}

const sanitizePath = (raw: string): string => {
  return raw
    .trim()
    .split(/[\\/]+/)
    .map(segment => segment.trim())
    .filter(segment => segment !== "" && segment !== ".")
    .map(segment => segment.toLowerCase().replace(/[^a-z0-9_-]+/g, "_"))
    .join("/")
}

const promptName = async (rl: Interface): Promise<string> => {
  let name = ""
  while (!name) {
    const answer = await rl.question("Statement name: ")
    name = sanitizeName(answer)
    if (!name) {
      console.error(`Invalid statement name: "${answer.trim()}". Use letters, numbers, and underscores.`)
    }
  }
  return name
}

const promptType = async (rl: Interface): Promise<string> => {
  while (true) {
    const answer = (await rl.question(`Statement type (${TYPES.join("/")}): `)).trim().toLowerCase()
    if (TYPES.includes(answer)) return answer
    console.error(`Invalid type: "${answer}". Choose one of ${TYPES.join(", ")}.`)
  }
}

const promptPath = async (rl: Interface): Promise<string> => {
  const answer = await rl.question("Path within statements (blank for root): ")
  return sanitizePath(answer)
}

const main = async () => {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const name = await promptName(rl)
    const type = await promptType(rl)
    const subPath = await promptPath(rl)

    const dir = path.join(STATEMENTS_DIR, subPath)
    if (path.resolve(dir) !== path.resolve(STATEMENTS_DIR) && !path.resolve(dir).startsWith(path.resolve(STATEMENTS_DIR) + path.sep)) {
      console.error(`Path "${subPath}" escapes the statements directory.`)
      process.exit(1)
    }

    const fileName = `${name}.${type}.sql`
    const filePath = path.join(dir, fileName)
    if (fs.existsSync(filePath)) {
      console.error(`Statement already exists: ${path.relative(process.cwd(), filePath)}`)
      process.exit(1)
    }

    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(filePath, getEmptyFileTemplate(name, type))
    console.log(`Created ${path.relative(process.cwd(), filePath)}`)
  } finally {
    rl.close()
  }
}

main()

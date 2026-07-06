import path from "path"
import fs from "fs"
import readline from "readline/promises"

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');
const PREFIX_LENGTH = 7
const getEmptyFileTemplate = (name: string): string => {
  return `-- UP: ${name}\n-- Write your UP statements here\n-- DOWN: ${name}\n-- Write your DOWN statements here`
}

const promptName = async (): Promise<string> => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    let name = ""
    while (!name) {
      const answer = await rl.question("Migration name: ")
      name = answer.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")
      if (!name) {
        console.error(`Invalid migration name: "${answer.trim()}". Use letters, numbers, and underscores.`)
      }
    }
    return name
  } finally {
    rl.close()
  }
}

const main = async () => {
  const name = await promptName()

  fs.mkdirSync(MIGRATIONS_DIR, {recursive: true})

  let files = fs.readdirSync(MIGRATIONS_DIR, {withFileTypes: true})
  files = files.filter(file => path.extname(file.name) == '.sql')
  files.sort((a, b) => a.name.localeCompare(b.name))

  const last = files.pop()

  let sequence = 0
  if (last !== undefined) {
    sequence = Number(last.name.slice(0, PREFIX_LENGTH))
  }

  const newSequence = sequence + 1;
  const prefix = newSequence.toString().padStart(PREFIX_LENGTH, "0")
  const fileName = `${prefix}_${name}.sql`
  const filePath = path.join(MIGRATIONS_DIR, fileName)

  fs.writeFileSync(filePath, getEmptyFileTemplate(fileName))
  console.log(`Created ${path.relative(process.cwd(), filePath)}`)
}

main()

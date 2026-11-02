import * as path from 'path';
import * as fs from 'fs';
import { loadMigrations, loadStatements } from './lib/sources';
import { literal } from './lib/literal';

const GENERATED_DIR = path.join(process.cwd(), 'src', 'generated');
const NODE_DIR = path.join(GENERATED_DIR, 'node');

const BANNER = '// GENERATED FILE - DO NOT EDIT. Run `npm run generate`.';

const writeFile = (file: string, content: string): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
};

const main = () => {
  const migrations = loadMigrations();
  const statements = loadStatements();

  writeFile(
    path.join(NODE_DIR, 'migrations.ts'),
    `${BANNER}\nimport type { Migration } from '../../shared/types';\n\nexport const migrations: Migration[] = ${literal(migrations)};\n`
  );

  writeFile(
    path.join(NODE_DIR, 'statements.ts'),
    `${BANNER}\nimport type { StatementDef } from '../../shared/types';\n\nexport const statements: StatementDef[] = ${literal(statements)};\n`
  );

  console.log(`Generated ${migrations.length} migration(s) and ${statements.length} statement(s).`);
};

main();

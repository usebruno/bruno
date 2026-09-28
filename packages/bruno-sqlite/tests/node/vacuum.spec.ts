import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { vacuumIntoStatement } from '../../scripts/lib/sql';

describe('vacuumIntoStatement', () => {
  it('single-quotes the backup path', () => {
    expect(vacuumIntoStatement('/tmp/backup.db')).toBe(`VACUUM INTO '/tmp/backup.db'`);
  });

  it('escapes single quotes in the path by doubling them', () => {
    expect(vacuumIntoStatement(`/tmp/O'Connor/backup.db`)).toBe(`VACUUM INTO '/tmp/O''Connor/backup.db'`);
    expect(vacuumIntoStatement(`/tmp/a'b'c.db`)).toBe(`VACUUM INTO '/tmp/a''b''c.db'`);
  });

  describe('executed against a real database', () => {
    let dir: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), `bruno-sqlite-o'connor-`));
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('produces a valid VACUUM for a path containing a single quote', () => {
      const source = new DatabaseSync(':memory:');
      source.exec('CREATE TABLE t (id INTEGER PRIMARY KEY)');

      const backupPath = join(dir, 'bruno_backup.db');
      expect(backupPath).toContain(`'`);

      source.exec(vacuumIntoStatement(backupPath));
      source.close();

      expect(existsSync(backupPath)).toBe(true);
    });
  });
});

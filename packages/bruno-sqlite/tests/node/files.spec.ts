import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { FileStore } from '../../src/node/files';
import { filesDirFor } from '../../src/node/index';
import { createTestDatabase } from '../utils';
import type { TestDatabase } from '../utils';

jest.mock('node:fs/promises', () => {
  const actual = jest.requireActual('node:fs/promises');
  return { ...actual, writeFile: jest.fn(actual.writeFile) };
});

const INLINE_MAX = 64;
const ORPHAN_NAME = '11111111-2222-3333-4444-555555555555';

describe('FileStore', () => {
  let database: TestDatabase;
  let files: FileStore;
  let db: any;

  beforeEach(() => {
    database = createTestDatabase({ inlineMaxBytes: INLINE_MAX });
    files = database.files!;
    db = database.db;
  });

  afterEach(() => database.cleanup());

  const onDisk = (): string[] => (existsSync(files.directory) ? readdirSync(files.directory) : []);

  describe('write', () => {
    it('keeps a payload at or under the inline limit in the row', async () => {
      const entry = await files.write('hello world', { contentType: 'text/plain' });

      expect(entry).toMatchObject({ size: 11, inline: true, contentType: 'text/plain' });
      expect(onDisk()).toHaveLength(0);
    });

    it('spills a payload over the limit to the files directory', async () => {
      const entry = await files.write(Buffer.alloc(INLINE_MAX + 1, 0x61));

      expect(entry).toMatchObject({ size: INLINE_MAX + 1, inline: false });
      expect(onDisk()).toHaveLength(1);
    });

    it('lets the schema stamp created_at and updated_at in epoch seconds', async () => {
      const before = Math.floor(Date.now() / 1000);
      const { id } = await files.write('hello');

      const row = db._db.prepare('SELECT created_at, updated_at FROM files WHERE id = ?').get(id);

      expect(row.created_at).toBeGreaterThanOrEqual(before);
      expect(row.created_at).toBeLessThanOrEqual(before + 5);
      expect(row.updated_at).toBe(row.created_at);
    });

    it('accepts a string, bytes and nothing at all', async () => {
      const text = await files.write('{"a":1}');
      const bytes = await files.write(Buffer.from([1, 2, 3]));
      const empty = await files.write(null);

      expect(Buffer.from((await files.read(text.id))!).toString()).toBe('{"a":1}');
      expect(Buffer.from((await files.read(bytes.id))!)).toEqual(Buffer.from([1, 2, 3]));
      expect(empty.size).toBe(0);
    });
  });

  describe('read', () => {
    it('reads an inline payload', async () => {
      const { id } = await files.write('hello world');

      expect(Buffer.from((await files.read(id))!).toString()).toBe('hello world');
    });

    it('reads a spilled payload', async () => {
      const payload = Buffer.concat([Buffer.alloc(INLINE_MAX, 0x61), Buffer.from('needle')]);
      const { id } = await files.write(payload);

      expect(Buffer.from((await files.read(id))!)).toEqual(payload);
    });

    it('reads an empty payload', async () => {
      const { id } = await files.write(null);

      expect((await files.read(id))!.byteLength).toBe(0);
    });

    it('returns null for an unknown id', async () => {
      expect(await files.read(9999)).toBeNull();
      expect(files.stat(9999)).toBeNull();
    });
  });

  describe('remove', () => {
    it('drops the row and the spilled file', async () => {
      const { id } = await files.write(Buffer.alloc(INLINE_MAX + 1));

      expect(await files.remove(id)).toBe(true);

      expect(files.stat(id)).toBeNull();
      expect(onDisk()).toHaveLength(0);
      expect(await files.remove(id)).toBe(false);
    });
  });

  describe('collect', () => {
    const referencingTable = () => {
      db._db.exec('CREATE TABLE notes (id INTEGER PRIMARY KEY, file_id INTEGER REFERENCES files(id))');
    };

    it('finds the tables that point at files', () => {
      const before = files.referrers();
      expect(before).not.toContainEqual({ table: 'notes', column: 'file_id' });

      referencingTable();

      expect(files.referrers()).toContainEqual({ table: 'notes', column: 'file_id' });
      expect(files.referrers()).toHaveLength(before.length + 1);
    });

    it('leaves every row alone while nothing references files', async () => {
      // The shipped schema has referrers, so the guard is exercised by taking them away.
      for (const table of new Set(files.referrers().map((row) => row.table))) db._db.exec(`DROP TABLE ${table}`);
      const { id } = await files.write('orphan by definition');

      expect(files.referrers()).toEqual([]);
      expect(await files.collect()).toMatchObject({ rows: 0 });
      expect(files.stat(id)).not.toBeNull();
    });

    it('keeps a row that a referencing table still points at', async () => {
      referencingTable();
      const { id } = await files.write('kept');
      db._db.prepare('INSERT INTO notes (file_id) VALUES (?)').run(id);

      expect(await files.collect()).toMatchObject({ rows: 0 });
      expect(files.stat(id)).not.toBeNull();
    });

    it('deletes rows nothing points at, with their files', async () => {
      referencingTable();
      const kept = await files.write('kept');
      db._db.prepare('INSERT INTO notes (file_id) VALUES (?)').run(kept.id);
      const inline = await files.write('dropped');
      const spilled = await files.write(Buffer.alloc(INLINE_MAX + 1));

      expect(await files.collect()).toMatchObject({ rows: 2 });

      expect(files.stat(kept.id)).not.toBeNull();
      expect(files.stat(inline.id)).toBeNull();
      expect(files.stat(spilled.id)).toBeNull();
      expect(onDisk()).toHaveLength(0);
    });

    it('collects a row once its last reference goes', async () => {
      referencingTable();
      const { id } = await files.write(Buffer.alloc(INLINE_MAX + 1));
      db._db.prepare('INSERT INTO notes (file_id) VALUES (?)').run(id);
      await files.collect();
      expect(onDisk()).toHaveLength(1);

      db._db.exec('DELETE FROM notes');

      expect(await files.collect()).toMatchObject({ rows: 1 });
      expect(onDisk()).toHaveLength(0);
    });

    it('sweeps files on disk that no row names', async () => {
      mkdirSync(files.directory, { recursive: true });
      writeFileSync(join(files.directory, `${ORPHAN_NAME}.bin`), 'junk');

      expect(await files.collect()).toMatchObject({ files: 1 });
      expect(onDisk()).toHaveLength(0);
    });

    it('leaves entries it did not write alone rather than deleting unrelated data', async () => {
      mkdirSync(files.directory, { recursive: true });
      writeFileSync(join(files.directory, 'notes.txt'), 'not ours');
      writeFileSync(join(files.directory, 'orphan.bin'), 'not ours either');

      expect(await files.collect()).toMatchObject({ files: 0 });
      expect(onDisk().sort()).toEqual(['notes.txt', 'orphan.bin']);
    });

    describe('while a spilled write is in flight', () => {
      let release: () => void;

      const holdNextWrite = (): Promise<void> => {
        const actual = jest.requireActual('node:fs/promises');
        const gate = new Promise<void>((resolve) => {
          release = resolve;
        });
        return new Promise((written) => {
          (writeFile as jest.Mock).mockImplementationOnce(async (...args: unknown[]) => {
            await actual.writeFile(...args);
            written();
            await gate;
          });
        });
      };

      it('does not sweep the file before its row is inserted', async () => {
        const written = holdNextWrite();
        const pending = files.write(Buffer.alloc(INLINE_MAX + 1));
        await written;

        expect(await files.collect()).toMatchObject({ files: 0 });
        expect(onDisk()).toHaveLength(1);

        release();
        const { id } = await pending;

        expect(Buffer.from((await files.read(id))!)).toEqual(Buffer.alloc(INLINE_MAX + 1));
      });

      it('still sweeps real orphans alongside it', async () => {
        mkdirSync(files.directory, { recursive: true });
        writeFileSync(join(files.directory, `${ORPHAN_NAME}.bin`), 'junk');
        const written = holdNextWrite();
        const pending = files.write(Buffer.alloc(INLINE_MAX + 1));
        await written;

        expect(await files.collect()).toMatchObject({ files: 1 });
        expect(onDisk()).not.toContain(`${ORPHAN_NAME}.bin`);

        release();
        await pending;
      });

      it('sweeps the file of a write whose insert failed', async () => {
        const insert = jest.spyOn(files._statements, 'execute').mockImplementationOnce(() => {
          throw new Error('insert failed');
        });

        await expect(files.write(Buffer.alloc(INLINE_MAX + 1))).rejects.toThrow('insert failed');
        insert.mockRestore();

        expect(files._writing.size).toBe(0);
        expect(onDisk()).toHaveLength(0);
      });
    });
  });

  describe('pathFor', () => {
    it('resolves a name the store itself wrote', () => {
      expect(files.pathFor(`${ORPHAN_NAME}.bin`)).toBe(join(files.directory, `${ORPHAN_NAME}.bin`));
    });

    it.each([
      ['a traversal', '../../../../etc/passwd'],
      ['an absolute path', '/etc/passwd'],
      ['a name with the wrong extension', `${ORPHAN_NAME}.txt`],
      ['an arbitrary name', 'notes.txt']
    ])('refuses %s', (_label, fileName) => {
      expect(() => files.pathFor(fileName)).toThrow('refusing to resolve an unexpected file name');
    });

    it('refuses to read a row whose file_name was tampered with', async () => {
      db._db.prepare('INSERT INTO files (content_type, size, file_name, data) VALUES (?, ?, ?, ?)').run(
        null,
        1024,
        '../../../../etc/passwd',
        null
      );
      const id = Number(db._db.prepare('SELECT max(id) AS id FROM files').get().id);

      await expect(files.read(id)).rejects.toThrow('refusing to resolve an unexpected file name');
    });
  });

  it('derives the files directory from the database path', () => {
    expect(filesDirFor('/data/bruno.db')).toBe(join('/data', 'bruno-files'));
  });
});

import { randomUUID } from 'node:crypto';
import { mkdir, open, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DatabaseSync, StatementSync } from 'node:sqlite';
import type { Statements } from './statements';
import { INLINE_MAX_BYTES, CollectResult, FileData, FileEntry, FileRange, FileWriteOptions } from '../shared/files';

type MetaRow = {
  id: number;
  content_type: string | null;
  size: number;
  file_name: string | null;
};

export type FileStoreOptions = {
  directory: string;
  inlineMaxBytes?: number;
};

export type FileLocation = FileEntry & {
  path: string | null;
};

const quoted = (identifier: string): string => `"${identifier.replace(/"/g, '""')}"`;

// The only names write() ever produces. bruno.db is a plain file under userData, so a row's
// file_name is untrusted input however it got there — anything else must never become a path.
const SPILLED_FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.bin$/;

const toBytes = (data: FileData | null | undefined): Buffer => {
  if (data === null || data === undefined) return Buffer.alloc(0);
  if (typeof data === 'string') return Buffer.from(data, 'utf8');
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
};

export class FileStore {
  _db: DatabaseSync;
  _statements: Statements;
  _directory: string;
  _inlineMaxBytes: number;

  constructor(db: DatabaseSync, statements: Statements, options: FileStoreOptions) {
    this._db = db;
    this._statements = statements;
    this._directory = options.directory;
    this._inlineMaxBytes = options.inlineMaxBytes ?? INLINE_MAX_BYTES;
  }

  get directory(): string {
    return this._directory;
  }

  pathFor(fileName: string): string {
    if (!SPILLED_FILE_NAME.test(fileName)) {
      throw new Error(`refusing to resolve an unexpected file name: ${fileName}`);
    }
    return join(this._directory, fileName);
  }

  async write(data: FileData | null, options: FileWriteOptions = {}): Promise<FileEntry> {
    const bytes = toBytes(data);
    const inline = bytes.length <= this._inlineMaxBytes;
    let fileName: string | null = null;

    if (!inline) {
      fileName = `${randomUUID()}.bin`;
      await mkdir(this._directory, { recursive: true });
      await writeFile(this.pathFor(fileName), bytes);
    }

    try {
      const result = this._statements.execute('insert_file', {
        content_type: options.contentType ?? null,
        size: bytes.length,
        data: inline ? bytes : null,
        file_name: fileName
      }) as { lastInsertRowid: number | bigint };

      return { id: Number(result.lastInsertRowid), contentType: options.contentType ?? null, size: bytes.length, inline };
    } catch (err) {
      if (fileName) await this._remove(fileName);
      throw err;
    }
  }

  locate(id: number): FileLocation | null {
    const row = this._statements.execute('get_file_meta', { id }) as MetaRow | undefined;
    if (row === undefined) return null;
    return {
      id: row.id,
      contentType: row.content_type,
      size: row.size,
      inline: row.file_name === null,
      path: row.file_name === null ? null : this.pathFor(row.file_name)
    };
  }

  stat(id: number): FileEntry | null {
    const found = this.locate(id);
    if (found === null) return null;
    const { path, ...entry } = found;
    return entry;
  }

  async read(id: number, range: FileRange = {}): Promise<Uint8Array | null> {
    const found = this.locate(id);
    if (found === null) return null;

    const start = Math.max(0, Math.min(range.offset ?? 0, found.size));
    const end = range.length === undefined ? found.size : Math.min(found.size, start + Math.max(0, range.length));
    if (end <= start) return Buffer.alloc(0);

    if (found.path === null) {
      const row = this._statements.execute('read_file_slice', { id, offset: start + 1, length: end - start }) as
        | { slice: Uint8Array | null }
        | undefined;
      return row && row.slice ? Buffer.from(row.slice) : Buffer.alloc(0);
    }

    const handle = await open(found.path, 'r');
    try {
      const buffer = Buffer.allocUnsafe(end - start);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
      return buffer.subarray(0, bytesRead);
    } finally {
      await handle.close();
    }
  }

  async readText(id: number, range: FileRange = {}): Promise<string | null> {
    const bytes = await this.read(id, range);
    if (bytes === null) return null;
    return Buffer.from(bytes).toString('utf8');
  }

  async remove(id: number): Promise<boolean> {
    const found = this.locate(id);
    if (found === null) return false;
    this._statements.execute('delete_file', { id });
    if (found.path !== null) await this._remove(found.path, true);
    return true;
  }

  referrers(): { table: string; column: string }[] {
    const rows = this._statements.execute('list_file_referrers') as {
      ref_table: string;
      ref_column: string;
    }[];
    return rows.map((row) => ({ table: row.ref_table, column: row.ref_column }));
  }

  async collect(): Promise<CollectResult> {
    return { rows: await this._deleteUnreferenced(), files: await this._sweepOrphans() };
  }

  _unreferencedStatement(): StatementSync | null {
    const referrers = this.referrers();
    if (referrers.length === 0) return null;

    const unreferenced = referrers
      .map(({ table, column }) => {
        const source = quoted(table);
        return `NOT EXISTS (SELECT 1 FROM ${source} WHERE ${source}.${quoted(column)} = files.id)`;
      })
      .join(' AND ');

    return this._db.prepare(`DELETE FROM files WHERE ${unreferenced} RETURNING file_name`);
  }

  async _deleteUnreferenced(): Promise<number> {
    const statement = this._unreferencedStatement();
    if (statement === null) return 0;

    const deleted = statement.all() as { file_name: string | null }[];
    for (const row of deleted) {
      if (row.file_name) await this._remove(row.file_name);
    }
    return deleted.length;
  }

  async _sweepOrphans(): Promise<number> {
    const referenced = new Set(
      (this._statements.execute('list_file_names') as { file_name: string }[]).map((row) => row.file_name)
    );

    let entries: string[];
    try {
      entries = await readdir(this._directory);
    } catch {
      return 0;
    }

    let removed = 0;
    for (const name of entries) {
      if (!SPILLED_FILE_NAME.test(name)) continue;
      if (referenced.has(name)) continue;
      await this._remove(name);
      removed += 1;
    }
    return removed;
  }

  async _remove(fileName: string, absolute = false): Promise<void> {
    await rm(absolute ? fileName : this.pathFor(fileName), { force: true, maxRetries: 3 }).catch(() => undefined);
  }
}

export const createFileStore = (db: DatabaseSync, statements: Statements, options: FileStoreOptions): FileStore =>
  new FileStore(db, statements, options);

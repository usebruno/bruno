import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DatabaseSync, StatementSync } from 'node:sqlite';
import type { Statements } from './statements';
import { INLINE_MAX_BYTES, CollectResult, FileData, FileEntry, FileWriteOptions } from '../shared/files';

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

const SPILLED_FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.bin$/;

const toBytes = (data: FileData | null | undefined): Buffer => {
  if (data === null || data === undefined) return Buffer.alloc(0);
  if (typeof data === 'string') return Buffer.from(data, 'utf8');
  return Buffer.from(data.buffer, data.byteOffset, data.byteLength);
};

export class FileStore {
  _db: DatabaseSync;
  _statements: Statements;
  readonly directory: string;
  _inlineMaxBytes: number;

  constructor(db: DatabaseSync, statements: Statements, options: FileStoreOptions) {
    this._db = db;
    this._statements = statements;
    this.directory = options.directory;
    this._inlineMaxBytes = options.inlineMaxBytes ?? INLINE_MAX_BYTES;
  }

  pathFor(fileName: string): string {
    if (!SPILLED_FILE_NAME.test(fileName)) {
      throw new Error(`refusing to resolve an unexpected file name: ${fileName}`);
    }
    return join(this.directory, fileName);
  }

  async write(data: FileData | null, options: FileWriteOptions = {}): Promise<FileEntry> {
    const bytes = toBytes(data);
    const inline = bytes.length <= this._inlineMaxBytes;
    let fileName: string | null = null;

    if (!inline) {
      fileName = `${randomUUID()}.bin`;
      await mkdir(this.directory, { recursive: true });
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

  async read(id: number): Promise<Uint8Array | null> {
    const found = this.locate(id);
    if (found === null) return null;
    if (found.path !== null) return readFile(found.path);

    const row = this._statements.execute('get_file_data', { id }) as { data: Uint8Array | null } | undefined;
    return row && row.data ? Buffer.from(row.data) : Buffer.alloc(0);
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
      entries = await readdir(this.directory);
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

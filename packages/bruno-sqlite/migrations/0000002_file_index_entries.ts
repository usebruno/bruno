/**
 * `mtime` holds a filesystem modification time in nanoseconds (`stat.mtimeNs`), around 1.79e18 -
 * far past the 9.007e15 that a JavaScript number represents exactly. Rounding one would make an
 * edited file look untouched and the cache would serve a stale copy of the user's request, so the
 * value has to survive the round trip digit for digit. Both INTEGER and TEXT manage that; they
 * differ elsewhere:
 *
 *   |            | INTEGER (SQLite's 64-bit int)      | TEXT                             |
 *   |------------|------------------------------------|----------------------------------|
 *   | per row    | 8 bytes                            | 19 bytes                         |
 *   | ORDER BY   | numeric, correct                   | lexicographic: '9007…' > '1788…' |
 *   | reading    | needs the `:bigints` annotation,   | plain string, no setup           |
 *   |            | yields a BigInt                    |                                  |
 *   | writing    | binds `stat.mtimeNs` directly      | needs `String()` for typecasting |
 *
 * Speed is not the deciding factor - the two measure the same within noise, INTEGER wins on
 * correct ordering and on binding the value the filesystem already hands us, without a conversion
 * every writer has to remember.
 */
export const up = (): string => {
  return `
    CREATE TABLE IF NOT EXISTS file_index_entries (
      collection_path TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      id TEXT NOT NULL,
      mtime INTEGER NOT NULL,
      hash TEXT NOT NULL,
      data TEXT NOT NULL,
      raw TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      PRIMARY KEY (collection_path, relative_path)
    ) WITHOUT ROWID;

    CREATE INDEX IF NOT EXISTS idx_file_index_lookup
      ON file_index_entries(collection_path, relative_path, mtime, hash, id);

    CREATE INDEX IF NOT EXISTS idx_file_index_url
      ON file_index_entries(json_extract(data, '$.request.url'));
    CREATE INDEX IF NOT EXISTS idx_file_index_method
      ON file_index_entries(json_extract(data, '$.request.method'));
    CREATE INDEX IF NOT EXISTS idx_file_index_name
      ON file_index_entries(json_extract(data, '$.name'));
  `;
};

export const down = (): string => {
  return 'DROP TABLE IF EXISTS file_index_entries;';
};

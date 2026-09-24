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
      content_bytes INTEGER,
      application_version TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      PRIMARY KEY (collection_path, relative_path)
    ) WITHOUT ROWID;

    CREATE INDEX IF NOT EXISTS idx_file_index_lookup
      ON file_index_entries(collection_path, relative_path);
  `;
};

export const down = (): string => {
  return 'DROP TABLE IF EXISTS file_index_entries;';
};

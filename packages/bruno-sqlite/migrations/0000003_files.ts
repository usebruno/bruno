export const up = (): string => {
  return `
    CREATE TABLE files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_type TEXT,
      size INTEGER NOT NULL DEFAULT 0,
      file_name TEXT,
      data BLOB,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `;
};

export const down = (): string => {
  return `
    DROP TABLE IF EXISTS files;
  `;
};

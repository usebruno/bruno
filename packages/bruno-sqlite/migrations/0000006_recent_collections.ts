export const up = (): string => {
  return `
    CREATE TABLE recent_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path_key TEXT NOT NULL,
      path TEXT NOT NULL,
      name TEXT NOT NULL,
      used_at INTEGER NOT NULL,
      last_event TEXT NOT NULL CHECK (last_event IN ('opened', 'closed'))
    );

    CREATE UNIQUE INDEX idx_recent_collections_path_key ON recent_collections(path_key);
  `;
};

export const down = (): string => {
  return `
    DROP TABLE IF EXISTS recent_collections;
  `;
};

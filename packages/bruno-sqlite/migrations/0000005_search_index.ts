export const up = (): string => {
  return `
    CREATE TABLE IF NOT EXISTS search_index (
      collection_path TEXT NOT NULL,
      path TEXT NOT NULL,
      entity TEXT NOT NULL CHECK (entity IN ('collection', 'folder', 'request')),
      name TEXT NOT NULL,
      collection_name TEXT NOT NULL,
      folder_path TEXT,
      folder_name TEXT,
      method TEXT,
      url TEXT,
      protocol TEXT,
      seq INTEGER,
      error TEXT,
      workspace_path TEXT,
      source_path TEXT,
      mtime INTEGER,
      hash TEXT,
      PRIMARY KEY (collection_path, path)
    ) WITHOUT ROWID;

    CREATE INDEX IF NOT EXISTS idx_search_index_collections ON search_index(collection_path) WHERE entity = 'collection';
    CREATE INDEX IF NOT EXISTS idx_search_index_folders ON search_index(collection_path, path, name, seq, collection_name, workspace_path) WHERE entity = 'folder';
  `;
};

export const down = (): string => {
  return `
    DROP INDEX IF EXISTS idx_search_index_folders;
    DROP INDEX IF EXISTS idx_search_index_collections;
    DROP TABLE IF EXISTS search_index;
  `;
};

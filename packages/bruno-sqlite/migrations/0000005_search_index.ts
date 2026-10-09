// The search index behind the sidebar and global search. Everything here is derived from the files on disk and can be
// rebuilt at any time.
export const up = (): string => {
  return `
    -- One row per request file. A request that could not be parsed keeps a row too, with the error message in
    -- request_error, so it can still be found by what could be read from it and is not read again until it changes.
    CREATE TABLE IF NOT EXISTS search_index_entries (
      collection_path TEXT NOT NULL,
      collection_name TEXT NOT NULL,
      folder_path TEXT,
      folder_name TEXT,
      request_path TEXT NOT NULL,
      request_name TEXT NOT NULL,
      request_type TEXT,
      request_url TEXT,
      request_protocol TEXT,
      request_seq INTEGER,
      request_error TEXT,
      workspace_path TEXT,
      mtime INTEGER NOT NULL,
      hash TEXT NOT NULL,
      PRIMARY KEY (collection_path, request_path)
    ) WITHOUT ROWID;

    -- The files that name things: bruno.json / opencollection.yml (the collection) and folder.bru / folder.yml
    -- (a folder). One row per file, with the name and seq read from it.
    CREATE TABLE IF NOT EXISTS search_index_meta (
      collection_path TEXT NOT NULL,
      relative_path TEXT NOT NULL,
      kind TEXT NOT NULL,
      folder_path TEXT NOT NULL,
      name TEXT,
      seq INTEGER,
      mtime INTEGER NOT NULL,
      hash TEXT NOT NULL,
      PRIMARY KEY (collection_path, relative_path)
    ) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS idx_search_index_meta_lookup
      ON search_index_meta(collection_path, kind, folder_path);

    -- Every folder of a collection, with or without requests in it: an empty folder is still a folder you can
    -- search for.
    CREATE TABLE IF NOT EXISTS search_index_folders (
      collection_path TEXT NOT NULL,
      collection_name TEXT NOT NULL,
      folder_path TEXT NOT NULL,
      folder_name TEXT NOT NULL,
      workspace_path TEXT,
      PRIMARY KEY (collection_path, folder_path)
    ) WITHOUT ROWID;

    -- The request rows with the collection name and folder name read from the naming files, so a renamed folder or
    -- collection shows its new name without rewriting the request rows.
    CREATE VIEW IF NOT EXISTS search_index_view AS
    SELECT
      e.collection_path AS collection_path,
      COALESCE(
        (SELECT m.name FROM search_index_meta m
          WHERE m.collection_path = e.collection_path AND m.kind IN ('collection', 'config') AND m.name IS NOT NULL
          ORDER BY CASE m.kind WHEN 'collection' THEN 0 ELSE 1 END LIMIT 1),
        e.collection_name
      ) AS collection_name,
      e.folder_path AS folder_path,
      COALESCE(
        (SELECT m.name FROM search_index_meta m
          WHERE m.collection_path = e.collection_path AND m.kind = 'folder' AND m.folder_path = e.folder_path
            AND m.name IS NOT NULL),
        e.folder_name
      ) AS folder_name,
      e.request_path AS request_path,
      e.request_name AS request_name,
      e.request_type AS request_type,
      e.request_url AS request_url,
      e.request_protocol AS request_protocol,
      e.request_seq AS request_seq,
      e.request_error AS request_error,
      e.workspace_path AS workspace_path
    FROM search_index_entries e;

    -- The folders with their collection name and folder name read from the naming files.
    CREATE VIEW IF NOT EXISTS search_index_folder_view AS
    SELECT
      f.collection_path AS collection_path,
      COALESCE(
        (SELECT m.name FROM search_index_meta m
          WHERE m.collection_path = f.collection_path AND m.kind IN ('collection', 'config') AND m.name IS NOT NULL
          ORDER BY CASE m.kind WHEN 'collection' THEN 0 ELSE 1 END LIMIT 1),
        f.collection_name
      ) AS collection_name,
      f.folder_path AS folder_path,
      COALESCE(
        (SELECT m.name FROM search_index_meta m
          WHERE m.collection_path = f.collection_path AND m.kind = 'folder' AND m.folder_path = f.folder_path
            AND m.name IS NOT NULL),
        f.folder_name
      ) AS folder_name,
      f.workspace_path AS workspace_path
    FROM search_index_folders f;
  `;
};

export const down = (): string => {
  return `
    DROP VIEW IF EXISTS search_index_folder_view;
    DROP VIEW IF EXISTS search_index_view;
    DROP TABLE IF EXISTS search_index_folders;
    DROP TABLE IF EXISTS search_index_meta;
    DROP TABLE IF EXISTS search_index_entries;
  `;
};

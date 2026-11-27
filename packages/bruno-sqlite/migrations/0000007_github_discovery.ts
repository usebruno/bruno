// Owned by EE GitHub discovery: keep byte-identical with the EE copy. Times are epoch milliseconds.
export const up = (): string => {
  return `
    CREATE TABLE IF NOT EXISTS gh_account (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      host TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      login TEXT NOT NULL,
      token_hash TEXT NOT NULL CHECK (length(token_hash) = 64),
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gh_queries (
      query_key TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      result_count INTEGER NOT NULL,
      total INTEGER,
      has_next INTEGER NOT NULL,
      incomplete INTEGER NOT NULL,
      searched_at INTEGER NOT NULL,
      last_seen INTEGER NOT NULL
    ) WITHOUT ROWID;

    CREATE INDEX IF NOT EXISTS idx_gh_queries_last_seen ON gh_queries(last_seen);

    CREATE TABLE IF NOT EXISTS gh_query_items (
      query_key TEXT NOT NULL,
      position INTEGER NOT NULL,
      repo_id INTEGER,
      collection_id INTEGER,
      PRIMARY KEY (query_key, position),
      CHECK ((repo_id IS NULL) <> (collection_id IS NULL))
    ) WITHOUT ROWID;

    CREATE TABLE IF NOT EXISTS gh_repos (
      repo_id INTEGER PRIMARY KEY,
      full_name TEXT NOT NULL COLLATE NOCASE,
      owner TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      avatar_url TEXT,
      visibility TEXT,
      is_private INTEGER NOT NULL CHECK (is_private IN (0, 1)),
      is_archived INTEGER NOT NULL DEFAULT 0,
      default_branch TEXT,
      tree_etag TEXT,
      tree_checked_at INTEGER,
      last_seen INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_gh_repos_last_seen ON gh_repos(last_seen);
    CREATE INDEX IF NOT EXISTS idx_gh_repos_full_name ON gh_repos(full_name COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS gh_collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_id INTEGER NOT NULL,
      folder_path TEXT NOT NULL,
      manifest_path TEXT NOT NULL,
      kind TEXT NOT NULL,
      blob_oid TEXT,
      request_count INTEGER,
      last_seen INTEGER NOT NULL,
      UNIQUE (repo_id, folder_path)
    );

    CREATE INDEX IF NOT EXISTS idx_gh_collections_last_seen ON gh_collections(last_seen);

    CREATE TABLE IF NOT EXISTS gh_names (
      blob_oid TEXT PRIMARY KEY,
      name TEXT,
      last_seen INTEGER NOT NULL
    ) WITHOUT ROWID;
  `;
};

export const down = (): string => {
  return `
    PRAGMA secure_delete = ON;
    DROP TABLE IF EXISTS gh_names;
    DROP TABLE IF EXISTS gh_collections;
    DROP TABLE IF EXISTS gh_repos;
    DROP TABLE IF EXISTS gh_query_items;
    DROP TABLE IF EXISTS gh_queries;
    DROP TABLE IF EXISTS gh_account;
    PRAGMA secure_delete = OFF;
  `;
};

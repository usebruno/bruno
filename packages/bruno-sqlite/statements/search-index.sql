-- name: search_index_upsert_entry :exec
INSERT INTO search_index_entries
  (collection_path, collection_name, folder_path, folder_name, request_path, request_name, request_type, request_url,
   request_protocol, request_seq, request_error, workspace_path, mtime, hash)
VALUES
  (@collection_path, @collection_name, @folder_path, @folder_name, @request_path, @request_name, @request_type,
   @request_url, @request_protocol, @request_seq, @request_error, @workspace_path, @mtime, @hash)
ON CONFLICT(collection_path, request_path) DO UPDATE SET
  collection_name = excluded.collection_name,
  folder_path = excluded.folder_path,
  folder_name = excluded.folder_name,
  request_name = excluded.request_name,
  request_type = excluded.request_type,
  request_url = excluded.request_url,
  request_protocol = excluded.request_protocol,
  request_seq = excluded.request_seq,
  request_error = excluded.request_error,
  workspace_path = COALESCE(excluded.workspace_path, search_index_entries.workspace_path),
  mtime = excluded.mtime,
  hash = excluded.hash;

-- name: search_index_delete_entry :exec
DELETE FROM search_index_entries
WHERE collection_path = @collection_path AND request_path = @request_path;

-- name: search_index_entries_metadata :many :bigints
SELECT request_path AS requestPath, mtime, hash
FROM search_index_entries
WHERE collection_path = @collection_path;

-- name: search_index_collection_paths :many
SELECT DISTINCT collection_path AS collectionPath
FROM search_index_entries;

-- name: search_index_collection_name :one
SELECT collection_name AS collectionName
FROM search_index_view
WHERE collection_path = @collection_path
LIMIT 1;

-- name: search_index_rows_for_collection :many
SELECT collection_path AS collectionPath, collection_name AS collectionName,
       folder_path AS folderPath, folder_name AS folderName,
       request_path AS requestPath, request_name AS requestName,
       request_type AS requestType, request_url AS requestUrl,
       request_protocol AS requestProtocol, request_seq AS requestSeq, request_error AS requestError,
       workspace_path AS workspacePath
FROM search_index_view
WHERE collection_path = @collection_path;

-- A row saved without a known workspace belongs to every workspace; no workspace given means no filter.
-- name: search_index_search_requests :many
SELECT collection_path AS collectionPath, collection_name AS collectionName,
       folder_path AS folderPath, folder_name AS folderName,
       request_path AS requestPath, request_name AS requestName,
       request_type AS requestType, request_url AS requestUrl,
       request_protocol AS requestProtocol, request_seq AS requestSeq, request_error AS requestError,
       workspace_path AS workspacePath
FROM search_index_view
WHERE (request_name LIKE @like OR request_path LIKE @like OR request_type LIKE @like OR request_url LIKE @like)
  AND (@workspace_path IS NULL OR workspace_path = @workspace_path OR workspace_path IS NULL);

-- name: search_index_search_collections :many
SELECT DISTINCT collection_path AS collectionPath, collection_name AS collectionName
FROM search_index_view
WHERE (collection_name LIKE @like OR collection_path LIKE @like)
  AND (@workspace_path IS NULL OR workspace_path = @workspace_path OR workspace_path IS NULL);

-- name: search_index_search_folders :many
SELECT collection_path AS collectionPath, collection_name AS collectionName,
       folder_path AS folderPath, folder_name AS folderName
FROM search_index_folder_view
WHERE (folder_name LIKE @like OR folder_path LIKE @like)
  AND (@workspace_path IS NULL OR workspace_path = @workspace_path OR workspace_path IS NULL);

-- name: search_index_meta_entries :many :bigints
SELECT relative_path AS relativePath, mtime, hash
FROM search_index_meta
WHERE collection_path = @collection_path;

-- name: search_index_upsert_meta :exec
INSERT INTO search_index_meta (collection_path, relative_path, kind, folder_path, name, seq, mtime, hash)
VALUES (@collection_path, @relative_path, @kind, @folder_path, @name, @seq, @mtime, @hash)
ON CONFLICT(collection_path, relative_path) DO UPDATE SET
  kind = excluded.kind,
  folder_path = excluded.folder_path,
  name = excluded.name,
  seq = excluded.seq,
  mtime = excluded.mtime,
  hash = excluded.hash;

-- name: search_index_delete_meta :exec
DELETE FROM search_index_meta
WHERE collection_path = @collection_path AND relative_path = @relative_path;

-- name: search_index_folders_for_collection :many
SELECT f.folder_path AS folderPath, COALESCE(m.name, f.folder_name) AS name, m.seq AS seq
FROM search_index_folders f
LEFT JOIN search_index_meta m
  ON m.collection_path = f.collection_path AND m.kind = 'folder' AND m.folder_path = f.folder_path
WHERE f.collection_path = @collection_path;

-- name: search_index_folder_paths :many
SELECT folder_path AS folderPath
FROM search_index_folders
WHERE collection_path = @collection_path;

-- name: search_index_upsert_folder :exec
INSERT INTO search_index_folders (collection_path, collection_name, folder_path, folder_name, workspace_path)
VALUES (@collection_path, @collection_name, @folder_path, @folder_name, @workspace_path)
ON CONFLICT(collection_path, folder_path) DO UPDATE SET
  collection_name = excluded.collection_name,
  folder_name = excluded.folder_name,
  workspace_path = COALESCE(excluded.workspace_path, search_index_folders.workspace_path);

-- name: search_index_delete_folder :exec
DELETE FROM search_index_folders
WHERE collection_path = @collection_path AND folder_path = @folder_path;

-- Removes a folder and everything under it
-- name: search_index_delete_folder_tree :exec
DELETE FROM search_index_folders
WHERE collection_path = @collection_path
  AND (folder_path = @folder_path OR substr(folder_path, 1, @prefix_length) = @prefix);

-- name: search_index_clear_entries :exec
DELETE FROM search_index_entries;

-- name: search_index_clear_meta :exec
DELETE FROM search_index_meta;

-- name: search_index_clear_folders :exec
DELETE FROM search_index_folders;

-- name: search_index_clear_collection_entries :exec
DELETE FROM search_index_entries WHERE collection_path = @collection_path;

-- name: search_index_clear_collection_meta :exec
DELETE FROM search_index_meta WHERE collection_path = @collection_path;

-- name: search_index_clear_collection_folders :exec
DELETE FROM search_index_folders WHERE collection_path = @collection_path;

-- The size shown in Preferences: the text the index holds, not the size of the shared database file
-- name: search_index_size :one
SELECT
  COALESCE((SELECT SUM(LENGTH(CAST(collection_path AS BLOB)) + LENGTH(CAST(request_path AS BLOB))
                       + LENGTH(CAST(request_name AS BLOB)) + LENGTH(CAST(COALESCE(request_url, '') AS BLOB))
                       + LENGTH(CAST(COALESCE(request_error, '') AS BLOB))) FROM search_index_entries), 0)
  + COALESCE((SELECT SUM(LENGTH(CAST(relative_path AS BLOB)) + LENGTH(CAST(COALESCE(name, '') AS BLOB)))
              FROM search_index_meta), 0)
  + COALESCE((SELECT SUM(LENGTH(CAST(folder_path AS BLOB))) FROM search_index_folders), 0) AS bytes;

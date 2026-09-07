-- name: file_index_stored :many :bigints
SELECT relative_path AS relativePath, id, mtime, hash
FROM file_index_entries
WHERE collection_path = @collection_path;

-- name: file_index_entries_for_collection :many
SELECT relative_path AS relativePath, data, raw
FROM file_index_entries
WHERE collection_path = @collection_path;

-- name: file_index_upsert :exec
INSERT INTO file_index_entries
  (collection_path, relative_path, id, mtime, hash, data, raw, content_bytes, created_at, updated_at)
VALUES
  (@collection_path, @relative_path, @id, @mtime, @hash, @data, @raw,
   LENGTH(@data) + LENGTH(COALESCE(@raw, '')), unixepoch(), unixepoch())
ON CONFLICT(collection_path, relative_path) DO UPDATE SET
  mtime = excluded.mtime,
  hash = excluded.hash,
  data = excluded.data,
  raw = excluded.raw,
  content_bytes = excluded.content_bytes,
  updated_at = unixepoch();

-- name: file_index_delete_entry :exec
DELETE FROM file_index_entries
WHERE collection_path = @collection_path AND relative_path = @relative_path;

-- name: file_index_clear_collection :exec
DELETE FROM file_index_entries WHERE collection_path = @collection_path;

-- name: file_index_clear :exec
DELETE FROM file_index_entries;

-- name: file_index_vacuum :exec
VACUUM;

-- name: file_index_size :one
SELECT COALESCE(SUM(content_bytes), 0) AS bytes
FROM file_index_entries;

-- name: file_index_metadata_for_collection :many :bigints
SELECT relative_path AS relativePath, id, mtime, hash
FROM file_index_entries
WHERE collection_path = @collection_path;

-- name: file_index_content_for_collection :many
SELECT relative_path AS relativePath, data, raw
FROM file_index_entries
WHERE collection_path = @collection_path;

-- name: file_index_upsert :exec
INSERT INTO file_index_entries
  (collection_path, relative_path, id, mtime, hash, data, raw, content_bytes, application_version,
   created_at, updated_at)
VALUES
  (@collection_path, @relative_path, @id, @mtime, @hash, @data, @raw,
   LENGTH(CAST(@data AS BLOB)) + LENGTH(CAST(COALESCE(@raw, '') AS BLOB)),
   @application_version, unixepoch(), unixepoch())
ON CONFLICT(collection_path, relative_path) DO UPDATE SET
  mtime = excluded.mtime,
  hash = excluded.hash,
  data = excluded.data,
  raw = excluded.raw,
  content_bytes = excluded.content_bytes,
  application_version = excluded.application_version,
  updated_at = unixepoch();

-- name: file_index_delete_entry :exec
DELETE FROM file_index_entries
WHERE collection_path = @collection_path AND relative_path = @relative_path;

-- name: file_index_clear_collection :exec
DELETE FROM file_index_entries WHERE collection_path = @collection_path;

-- name: file_index_clear :exec
DELETE FROM file_index_entries;

-- name: file_index_size :one
SELECT COALESCE(SUM(content_bytes), 0) AS bytes
FROM file_index_entries;

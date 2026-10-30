-- name: search_index_upsert_entry :exec
INSERT INTO search_index
  (collection_path, path, entity, name, collection_name, folder_path, folder_name, method, url, protocol, seq, error,
   mtime, hash)
VALUES
  (@collection_path, @request_path, 'request', @request_name,
   COALESCE((SELECT c.name FROM search_index c WHERE c.collection_path = @collection_path AND c.path = ''), @collection_name),
   @folder_path,
   CASE WHEN @folder_path IS NULL THEN NULL
        ELSE COALESCE((SELECT f.name FROM search_index f WHERE f.collection_path = @collection_path AND f.path = @folder_path), @folder_name) END,
   @request_type, @request_url, @request_protocol, @request_seq, @request_error, @mtime, @hash)
ON CONFLICT(collection_path, path) DO UPDATE SET
  name = excluded.name,
  collection_name = excluded.collection_name,
  folder_path = excluded.folder_path,
  folder_name = excluded.folder_name,
  method = excluded.method,
  url = excluded.url,
  protocol = excluded.protocol,
  seq = excluded.seq,
  error = excluded.error,
  mtime = excluded.mtime,
  hash = excluded.hash
WHERE excluded.mtime >= COALESCE(search_index.mtime, 0);

-- name: search_index_delete_entry :exec
DELETE FROM search_index
WHERE collection_path = @collection_path AND path = @request_path AND entity = 'request';

-- name: search_index_entries_metadata :many :bigints
SELECT path AS requestPath, mtime, hash
FROM search_index
WHERE collection_path = @collection_path AND entity = 'request';

-- name: search_index_collection_name :one
SELECT name AS collectionName
FROM search_index
WHERE collection_path = @collection_path AND path = '';

-- name: search_index_rows_for_collection :many
SELECT path AS requestPath, name AS requestName,
       method AS requestType, url AS requestUrl,
       protocol AS requestProtocol, seq AS requestSeq
FROM search_index
WHERE collection_path = @collection_path AND entity = 'request';

-- name: search_index_count_requests_in_collection :one
SELECT COUNT(*) AS total
FROM search_index
WHERE entity = 'request'
  AND collection_path = @collection_path
  AND (name LIKE @like ESCAPE '\' OR path LIKE @like ESCAPE '\' OR method LIKE @like ESCAPE '\' OR url LIKE @like ESCAPE '\' OR collection_name LIKE @like ESCAPE '\');

-- name: search_index_collection_source :one
SELECT source_path AS sourcePath
FROM search_index
WHERE collection_path = @collection_path AND path = '';

-- name: search_index_naming_owner :one
SELECT path, entity
FROM search_index
WHERE collection_path = @collection_path AND entity <> 'request' AND source_path = @source_path
LIMIT 1;

-- name: search_index_name_collection :exec
INSERT INTO search_index (collection_path, path, entity, name, collection_name, source_path, mtime, hash)
VALUES (@collection_path, '', 'collection', COALESCE(@name, @fallback_name), COALESCE(@name, @fallback_name),
        @source_path, @mtime, @hash)
ON CONFLICT(collection_path, path) DO UPDATE SET
  name = COALESCE(@name, search_index.name),
  collection_name = COALESCE(@name, search_index.name),
  source_path = excluded.source_path,
  mtime = excluded.mtime,
  hash = excluded.hash
WHERE @mtime IS NULL OR @mtime >= COALESCE(search_index.mtime, 0);

-- name: search_index_apply_collection_name :exec
UPDATE search_index
SET collection_name = @collection_name
WHERE collection_path = @collection_path AND entity <> 'collection' AND collection_name IS NOT @collection_name;

-- name: search_index_name_folder :exec
INSERT INTO search_index (collection_path, path, entity, name, collection_name, seq, source_path, mtime, hash)
VALUES (@collection_path, @folder_path, 'folder', @folder_name, @collection_name, @seq, @source_path, @mtime, @hash)
ON CONFLICT(collection_path, path) DO UPDATE SET
  name = excluded.name,
  seq = excluded.seq,
  source_path = excluded.source_path,
  mtime = excluded.mtime,
  hash = excluded.hash
WHERE @mtime IS NULL OR @mtime >= COALESCE(search_index.mtime, 0);

-- name: search_index_apply_folder_name :exec
UPDATE search_index
SET folder_name = @folder_name
WHERE collection_path = @collection_path AND entity = 'request' AND folder_path = @folder_path
  AND folder_name IS NOT @folder_name;

-- name: search_index_clear_naming :exec
UPDATE search_index
SET source_path = NULL, mtime = NULL, hash = NULL
WHERE collection_path = @collection_path AND entity <> 'request' AND source_path = @source_path;

-- name: search_index_folders_for_collection :many
SELECT path AS folderPath, name, seq
FROM search_index
WHERE collection_path = @collection_path AND entity = 'folder';

-- name: search_index_clear :exec
DELETE FROM search_index;

-- name: search_index_clear_collection :exec
DELETE FROM search_index WHERE collection_path = @collection_path;

-- name: search_index_size :one
SELECT COALESCE(SUM(LENGTH(CAST(collection_path AS BLOB)) + LENGTH(CAST(path AS BLOB))
                    + LENGTH(CAST(name AS BLOB)) + LENGTH(CAST(COALESCE(url, '') AS BLOB))
                    + LENGTH(CAST(COALESCE(error, '') AS BLOB))), 0) AS bytes
FROM search_index;

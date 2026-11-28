-- name: list_recent_collections :many
SELECT path, name, used_at AS usedAt, last_event AS lastEvent
FROM recent_collections
ORDER BY id DESC
LIMIT @max_rows;

-- name: record_recent_collection :exec
INSERT OR REPLACE INTO recent_collections (path_key, path, name, used_at, last_event)
VALUES (
  @path_key,
  COALESCE((SELECT path FROM recent_collections WHERE path_key = @path_key), @path),
  COALESCE(@name, (SELECT name FROM recent_collections WHERE path_key = @path_key), @folder_name),
  @used_at,
  @last_event
);

-- name: trim_recent_collections :exec
DELETE FROM recent_collections
WHERE id NOT IN (SELECT id FROM recent_collections ORDER BY id DESC LIMIT @max_rows);

-- name: forget_recent_collection :exec
DELETE FROM recent_collections WHERE path_key = @path_key;

-- name: move_recent_collection :exec
UPDATE OR REPLACE recent_collections SET path_key = @to_path_key, path = @to_path WHERE path_key = @from_path_key;

-- name: rename_recent_collection :exec
UPDATE recent_collections SET name = @name WHERE path_key = @path_key AND name <> @name;

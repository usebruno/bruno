-- name: insert_file :exec
INSERT INTO files (content_type, size, data, file_name)
VALUES (@content_type, @size, @data, @file_name);

-- name: get_file_meta :one
SELECT id, content_type, size, file_name FROM files WHERE id = @id;

-- name: get_file_data :one
SELECT data FROM files WHERE id = @id;

-- name: list_file_names :many
SELECT file_name FROM files WHERE file_name IS NOT NULL;

-- name: delete_file :exec
DELETE FROM files WHERE id = @id;

-- name: list_file_referrers :many
SELECT m.name AS ref_table, fk."from" AS ref_column
FROM sqlite_master m
JOIN pragma_foreign_key_list(m.name) fk
WHERE m.type = 'table' AND fk."table" = 'files';

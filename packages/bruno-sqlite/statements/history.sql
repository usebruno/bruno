-- name: insert_entry :exec
INSERT INTO network_entries (
  collection_uid, folder_uid, item_uid, request_uid, type, timestamp,
  req_method, req_url, res_status, res_size, res_duration,
  req_headers, req_body, res_status_text, res_headers, res_body, res_data_buffer, network_log
) VALUES (
  @collection_uid, @folder_uid, @item_uid, @request_uid, @type, @timestamp,
  @req_method, @req_url, @res_status, @res_size, @res_duration,
  @req_headers, @req_body, @res_status_text, @res_headers, @res_body, @res_data_buffer, @network_log
);

-- name: get_entry :one
SELECT * FROM network_entries WHERE id = @id;

-- name: list_history :many
SELECT id, collection_uid, folder_uid, item_uid, request_uid, type, timestamp,
       req_method, req_url, res_status, res_size, res_duration, in_timeline, in_history
FROM network_entries
WHERE in_history = 1
ORDER BY timestamp DESC;

-- name: list_timeline :many
SELECT id, collection_uid, folder_uid, item_uid, request_uid, type, timestamp,
       req_method, req_url, res_status, res_size, res_duration, in_timeline, in_history
FROM network_entries
WHERE in_timeline = 1 AND item_uid = @item_uid
ORDER BY timestamp DESC;

-- name: delete_from_history :exec
UPDATE network_entries SET in_history = 0 WHERE id = @id;

-- name: delete_from_timeline :exec
UPDATE network_entries SET in_timeline = 0 WHERE id = @id;

-- name: clear_history :exec
UPDATE network_entries SET in_history = 0;

-- name: clear_timeline :exec
UPDATE network_entries SET in_timeline = 0 WHERE item_uid = @item_uid;

-- name: purge_detached :exec
DELETE FROM network_entries WHERE in_timeline = 0 AND in_history = 0;

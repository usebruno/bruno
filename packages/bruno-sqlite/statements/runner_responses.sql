-- name: upsert_runner_response :exec
INSERT INTO runner_responses (
  request_uid, collection_uid, iteration_index, request_file_id, response_file_id, body_file_id
) VALUES (
  @request_uid, @collection_uid, @iteration_index, @request_file_id, @response_file_id, @body_file_id
)
ON CONFLICT (request_uid) DO UPDATE SET
  request_file_id = COALESCE(excluded.request_file_id, request_file_id),
  response_file_id = COALESCE(excluded.response_file_id, response_file_id),
  body_file_id = COALESCE(excluded.body_file_id, body_file_id),
  updated_at = unixepoch();

-- name: get_runner_response :one
SELECT
  runner_responses.request_file_id AS request_file_id,
  request_file.data AS request_data,
  runner_responses.response_file_id AS response_file_id,
  response_file.data AS response_data,
  runner_responses.body_file_id AS body_file_id,
  body_file.data AS body_data
FROM runner_responses
LEFT JOIN files AS request_file ON request_file.id = runner_responses.request_file_id
LEFT JOIN files AS response_file ON response_file.id = runner_responses.response_file_id
LEFT JOIN files AS body_file ON body_file.id = runner_responses.body_file_id
WHERE runner_responses.request_uid = @request_uid;

-- name: delete_runner_responses_for_collection :exec
DELETE FROM runner_responses WHERE collection_uid = @collection_uid;

-- name: list_runner_response_files_for_collection :many
SELECT request_file_id, response_file_id, body_file_id FROM runner_responses WHERE collection_uid = @collection_uid;

-- name: list_runner_response_files :many
SELECT request_file_id, response_file_id, body_file_id FROM runner_responses;

-- name: delete_runner_responses :exec
DELETE FROM runner_responses;

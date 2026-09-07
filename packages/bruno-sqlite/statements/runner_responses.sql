-- name: upsert_runner_response :exec
INSERT OR REPLACE INTO runner_responses (
  request_uid, collection_uid, request, response
) VALUES (
  @request_uid, @collection_uid,
  COALESCE(@request, (SELECT request FROM runner_responses WHERE request_uid = @request_uid)),
  COALESCE(@response, (SELECT response FROM runner_responses WHERE request_uid = @request_uid))
);

-- name: get_runner_response :one
SELECT request, response FROM runner_responses WHERE request_uid = @request_uid;

-- name: delete_runner_responses_for_collection :exec
DELETE FROM runner_responses WHERE collection_uid = @collection_uid;

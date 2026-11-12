-- name: get_grpc_reflection_cache :one
SELECT methods, descriptors, fetched_at FROM grpc_reflection_cache WHERE url = @url;

-- name: upsert_grpc_reflection_cache :exec
INSERT INTO grpc_reflection_cache (
  url, methods, descriptors, fetched_at
) VALUES (
  @url, @methods, @descriptors, unixepoch()
)
ON CONFLICT (url) DO UPDATE SET
  methods = excluded.methods,
  descriptors = excluded.descriptors,
  fetched_at = unixepoch();

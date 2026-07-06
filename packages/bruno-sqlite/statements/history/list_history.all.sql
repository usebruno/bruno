-- list_history (all)
SELECT id, collection_uid, folder_uid, item_uid, request_uid, type, timestamp,
       req_method, req_url, res_status, res_size, res_duration, in_timeline, in_history
FROM network_entries
WHERE in_history = 1
ORDER BY timestamp DESC;
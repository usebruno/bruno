-- list_timeline (all)
SELECT id, collection_uid, folder_uid, item_uid, request_uid, type, timestamp,
       req_method, req_url, res_status, res_size, res_duration, in_timeline, in_history
FROM network_entries
WHERE in_timeline = 1 AND item_uid = ?
ORDER BY timestamp DESC;
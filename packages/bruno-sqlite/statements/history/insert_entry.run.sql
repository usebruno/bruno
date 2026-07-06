-- insert_entry (run)
INSERT INTO network_entries (
  collection_uid, folder_uid, item_uid, request_uid, type, timestamp,
  req_method, req_url, res_status, res_size, res_duration,
  req_headers, req_body, res_status_text, res_headers, res_body, res_data_buffer, network_log
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
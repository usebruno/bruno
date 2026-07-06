-- UP: 0000001_create_network_entries.sql
CREATE TABLE network_entries (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  collection_uid  TEXT NOT NULL,
  folder_uid      TEXT,
  item_uid        TEXT,
  request_uid     TEXT,
  type            TEXT NOT NULL DEFAULT 'request',
  timestamp       INTEGER NOT NULL,
  req_method      TEXT,
  req_url         TEXT,
  res_status      INTEGER,
  res_size        INTEGER,
  res_duration    INTEGER,
  req_headers     TEXT,
  req_body        TEXT,
  res_status_text TEXT,
  res_headers     TEXT,
  res_body        TEXT,
  res_data_buffer TEXT,
  network_log     TEXT,
  in_timeline     INTEGER NOT NULL DEFAULT 1,
  in_history      INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX idx_network_item ON network_entries (item_uid);
CREATE INDEX idx_network_timestamp ON network_entries (timestamp);
-- DOWN: 0000001_create_network_entries.sql
DROP TABLE network_entries;

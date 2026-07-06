-- purge_detached (run)
DELETE FROM network_entries WHERE in_timeline = 0 AND in_history = 0;
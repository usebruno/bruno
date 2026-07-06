-- clear_timeline (run)
UPDATE network_entries SET in_timeline = 0 WHERE item_uid = ?;
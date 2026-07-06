-- delete_from_timeline (run)
UPDATE network_entries SET in_timeline = 0 WHERE id = ?;
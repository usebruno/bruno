-- delete_from_history (run)
UPDATE network_entries SET in_history = 0 WHERE id = ?;
export const up = (): string => {
  return `
    ALTER TABLE file_index_entries ADD COLUMN content_bytes INTEGER;

    UPDATE file_index_entries
      SET content_bytes = LENGTH(data) + LENGTH(COALESCE(raw, ''));

    CREATE INDEX IF NOT EXISTS idx_file_index_content_bytes
      ON file_index_entries(content_bytes);
  `;
};

export const down = (): string => {
  return `
    DROP INDEX IF EXISTS idx_file_index_content_bytes;
    ALTER TABLE file_index_entries DROP COLUMN content_bytes;
  `;
};

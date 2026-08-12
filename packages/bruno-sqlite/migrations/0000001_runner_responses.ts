export const up = (): string => {
  return `
    CREATE TABLE runner_responses (
      request_uid TEXT PRIMARY KEY,
      collection_uid TEXT NOT NULL,
      iteration_index INTEGER NOT NULL,
      item_uid TEXT NOT NULL,
      request TEXT,
      response TEXT
    );
    CREATE INDEX idx_runner_responses_scope ON runner_responses (collection_uid, iteration_index);
  `;
};
export const down = (): string => {
  return `
    DROP INDEX IF EXISTS idx_runner_responses_scope;
    DROP TABLE IF EXISTS runner_responses;
  `;
};

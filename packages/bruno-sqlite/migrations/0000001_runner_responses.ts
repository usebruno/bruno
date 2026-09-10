export const up = (): string => {
  return `
    CREATE TABLE runner_responses (
      request_uid TEXT PRIMARY KEY,
      collection_uid TEXT NOT NULL,
      request TEXT,
      response TEXT
    );
  `;
};
export const down = (): string => {
  return `
    DROP TABLE IF EXISTS runner_responses;
  `;
};

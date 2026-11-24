export const up = (): string => {
  return `
    DROP TABLE runner_responses;
    CREATE TABLE runner_responses (
      request_uid TEXT PRIMARY KEY,
      collection_uid TEXT NOT NULL,
      request_file_id INTEGER REFERENCES files(id),
      response_file_id INTEGER REFERENCES files(id),
      body_file_id INTEGER REFERENCES files(id),
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `;
};

export const down = (): string => {
  return `
    DROP TABLE runner_responses;
    CREATE TABLE runner_responses (
      request_uid TEXT PRIMARY KEY,
      collection_uid TEXT NOT NULL,
      request TEXT,
      response TEXT
    );
  `;
};

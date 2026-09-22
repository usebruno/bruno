export const up = (): string => {
  return `
    ALTER TABLE runner_responses DROP COLUMN request;
    ALTER TABLE runner_responses DROP COLUMN response;
    ALTER TABLE runner_responses ADD COLUMN request_file_id INTEGER REFERENCES files(id);
    ALTER TABLE runner_responses ADD COLUMN response_file_id INTEGER REFERENCES files(id);
    ALTER TABLE runner_responses ADD COLUMN body_file_id INTEGER REFERENCES files(id);
  `;
};

export const down = (): string => {
  return `
    ALTER TABLE runner_responses DROP COLUMN request_file_id;
    ALTER TABLE runner_responses DROP COLUMN response_file_id;
    ALTER TABLE runner_responses DROP COLUMN body_file_id;
    ALTER TABLE runner_responses ADD COLUMN request TEXT;
    ALTER TABLE runner_responses ADD COLUMN response TEXT;
  `;
};

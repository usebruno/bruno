export const up = (): string => {
  return 'ALTER TABLE runner_responses ADD COLUMN iteration_index INTEGER NOT NULL DEFAULT 0;';
};

export const down = (): string => {
  return 'ALTER TABLE runner_responses DROP COLUMN iteration_index;';
};

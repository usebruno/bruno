export const up = (): string => {
  return `
    CREATE TABLE grpc_reflection_cache (
      url TEXT PRIMARY KEY,
      methods TEXT NOT NULL,
      descriptors TEXT NOT NULL,
      fetched_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `;
};

export const down = (): string => {
  return `
    DROP TABLE IF EXISTS grpc_reflection_cache;
  `;
};

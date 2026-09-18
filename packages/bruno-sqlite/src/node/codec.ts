import type { DatabaseSync } from 'node:sqlite';

export const ENCRYPT_FUNCTION = 'bruno_encrypt';
export const DECRYPT_FUNCTION = 'bruno_decrypt';

export type Codec = {
  encrypt: (value: string) => string;
  decrypt: (value: string) => string;
};

export const passthroughCodec: Codec = {
  encrypt: (value) => value,
  decrypt: (value) => value
};

const nullable = (transform: (value: string) => string) => (value: unknown): string | null =>
  value === null || value === undefined ? null : transform(String(value));

export const registerCodec = (db: DatabaseSync, codec: Codec): void => {
  db.function(ENCRYPT_FUNCTION, nullable(codec.encrypt));
  db.function(DECRYPT_FUNCTION, nullable(codec.decrypt));
};

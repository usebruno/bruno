export const INLINE_MAX_BYTES = 1024 * 1024;

export type FileData = Uint8Array | string;

export type FileEntry = {
  id: number;
  contentType: string | null;
  size: number;
  inline: boolean;
};

export type FileRange = {
  offset?: number;
  length?: number;
};

export type FileWriteOptions = {
  contentType?: string | null;
};

export type CollectResult = {
  rows: number;
  files: number;
};

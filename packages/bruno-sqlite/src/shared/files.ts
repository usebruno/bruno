export const SQLITE_FILE_CHANNEL = 'usebruno:sqlite:file';
export const SQLITE_FILE_QUERY_KEY = 'sqlite-file';
export const FILES_TABLE = 'files';

export const INLINE_MAX_BYTES = 1024 * 1024;
export const MAX_TRANSFER_BYTES = 4 * 1024 * 1024;

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

export type FileOp = 'stat' | 'read';

export type FileRequest = {
  name: FileOp;
  params: {
    id: number;
    range?: FileRange;
  };
};

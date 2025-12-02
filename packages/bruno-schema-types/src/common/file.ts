import type { UID } from './uid';

export interface FileEntry {
  uid: UID;
  filePath?: string | null;
  contentType?: string | null;
  selected: boolean;
}

export type FileList = FileEntry[];


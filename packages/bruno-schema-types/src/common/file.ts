import { Annotation } from './annotation';
import type { UID } from './uid';

export interface FileEntry {
  uid: UID;
  filePath?: string | null;
  contentType?: string | null;
  selected: boolean;
  annotations?: Annotation[];
}

export type FileList = FileEntry[];

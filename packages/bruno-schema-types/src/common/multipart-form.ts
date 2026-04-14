import { Annotation } from './annotation';
import type { UID } from './uid';

export interface MultipartFormEntry {
  uid: UID;
  type: 'file' | 'text';
  name?: string | null;
  value?: string | string[] | null;
  description?: string | null;
  contentType?: string | null;
  enabled?: boolean;
  annotations: Annotation[];
}

export type MultipartForm = MultipartFormEntry[];

import type { KeyValue, Auth, Variables, HTTPScripts } from '../common';

export interface FolderRequest {
  headers?: KeyValue[] | null;
  auth?: Auth | null;
  // TODO: Widen scope to include GRPC scripts once Collection/Folder level inheritance is added to GRPC.
  script?: HTTPScripts | null;
  vars?: {
    req?: Variables | null;
    res?: Variables | null;
  } | null;
  tests?: string | null;
}

export interface FolderMeta {
  name?: string | null;
  seq?: number | null;
}

export interface FolderRoot {
  request?: FolderRequest | null;
  docs?: string | null;
  meta?: FolderMeta | null;
}

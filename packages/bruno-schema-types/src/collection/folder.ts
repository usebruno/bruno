import type { KeyValue, Auth, Script, Variables } from '../common';

export interface FolderRequest {
  headers?: KeyValue[] | null;
  auth?: Auth | null;
  script?: Script | null;
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


import type { UID } from '../common';
import type { Item } from './item';
import type { Environments } from './environment';
import type { FolderRoot } from './folder';

export interface RunnerResult {
  items?: unknown[] | null;
}

export interface Collection {
  version: '1';
  uid: UID;
  name: string;
  items: Item[];
  activeEnvironmentUid?: string | null;
  environments?: Environments | null;
  pathname?: string | null;
  runnerResult?: RunnerResult | null;
  runtimeVariables?: Record<string, unknown> | null;
  brunoConfig?: Record<string, unknown> | null;
  root?: FolderRoot | null;
}


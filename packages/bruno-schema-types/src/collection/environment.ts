import type { UID } from '../common';

export interface EnvironmentVariable {
  uid: UID;
  name?: string | null;
  value?: string | number | boolean | Record<string, unknown> | null;
  type: 'text';
  enabled?: boolean;
  secret?: boolean;
}

export interface Environment {
  uid: UID;
  name: string;
  variables: EnvironmentVariable[];
  color?: string | null;
}

export type Environments = Environment[];

import type { UID, Annotation } from '../common';

export type EnvironmentVariableDatatype = 'string' | 'number' | 'boolean' | 'object';

export interface EnvironmentVariable {
  uid: UID;
  name?: string | null;
  value?: string | number | boolean | Record<string, unknown> | null;
  type: 'text';
  enabled?: boolean;
  secret?: boolean;
  datatype?: EnvironmentVariableDatatype;
  annotations?: Annotation[] | null;
}

export interface ExternalSecretVariables {
  name: string;
  [key: string]: string;
}

export interface ExternalSecrets {
  type: string;
  variables: ExternalSecretVariables[];
}

export interface Environment {
  uid: UID;
  name: string;
  variables: EnvironmentVariable[];
  externalSecrets?: ExternalSecrets;
  color?: string | null;
}

export type Environments = Environment[];

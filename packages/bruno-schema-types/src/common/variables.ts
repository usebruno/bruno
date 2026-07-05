import { Annotation } from './annotation';
import type { UID } from './uid';

export type VariableDataType = 'string' | 'number' | 'boolean' | 'object';

/**
 * Request-scoped variable entry.
 */
export interface Variable {
  uid: UID;
  name?: string | null;
  value?: string | number | boolean | Record<string, unknown> | null;
  description?: string | null;
  enabled?: boolean;
  local?: boolean;
  dataType?: VariableDataType;
  annotations?: Annotation[] | null;
}

export type Variables = Variable[] | null;

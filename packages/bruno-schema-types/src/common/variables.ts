import { Annotation } from './annotation';
import type { UID } from './uid';

export type VariableDatatype = 'string' | 'number' | 'boolean' | 'object';

/**
 * Request-scoped variable entry.
 */
export interface Variable {
  uid: UID;
  name?: string | null;
  value?: string | null;
  description?: string | null;
  enabled?: boolean;
  local?: boolean;
  datatype?: VariableDatatype;
  annotations?: Annotation[] | null;
}

export type Variables = Variable[] | null;

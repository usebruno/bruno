import type { UID } from './uid';

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
}

export type Variables = Variable[] | null;


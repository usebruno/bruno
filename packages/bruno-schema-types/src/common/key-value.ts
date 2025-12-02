import type { UID } from './uid';

/**
 * Generic key/value structure used for headers, params, assertions, etc.
 */
export interface KeyValue {
  uid: UID;
  name?: string | null;
  value?: string | null;
  description?: string | null;
  enabled?: boolean;
}


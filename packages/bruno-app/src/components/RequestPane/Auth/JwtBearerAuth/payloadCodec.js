import { uuid } from 'utils/common';

export const JWT_VALUE_TYPES = ['string', 'number', 'boolean', 'json'];

// payloadStr → { rows, parseError }
// rows shape: { uid, key, value (string), type, enabled }
export const rowsFromPayload = (payloadStr) => {
  if (!payloadStr || !payloadStr.trim()) {
    return { rows: [], parseError: null };
  }
  let obj;
  try {
    obj = JSON.parse(payloadStr);
  } catch (e) {
    return { rows: [], parseError: e.message };
  }
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return { rows: [], parseError: 'Payload must be a JSON object' };
  }
  const rows = Object.entries(obj).map(([key, val]) => {
    if (typeof val === 'number') {
      return { uid: uuid(), key, value: String(val), type: 'number', enabled: true };
    }
    if (typeof val === 'boolean') {
      return { uid: uuid(), key, value: String(val), type: 'boolean', enabled: true };
    }
    if (val && typeof val === 'object') {
      return { uid: uuid(), key, value: JSON.stringify(val), type: 'json', enabled: true };
    }
    return { uid: uuid(), key, value: String(val ?? ''), type: 'string', enabled: true };
  });
  return { rows, parseError: null };
};

const DEFAULTS_BY_TYPE = {
  number: '0',
  boolean: 'false',
  json: '{}'
};

// rows → payloadStr (formatted JSON object, raw insertion for number/boolean/json
// so that `{{vars}}` get interpolated to JSON-valid literals before JSON.parse runs at runtime)
export const payloadFromRows = (rows) => {
  const active = (rows || []).filter((r) => r && r.enabled !== false && r.key && r.key.trim() !== '');
  if (!active.length) return '{}';
  const pairs = active.map((r) => {
    const k = JSON.stringify(r.key);
    const isEmpty = r.value == null || (typeof r.value === 'string' && r.value.trim() === '');
    let v;
    switch (r.type) {
      case 'number':
      case 'boolean':
      case 'json':
        // Raw insertion preserves `{{vars}}` so they interpolate to JSON-valid literals at runtime.
        // For empty values fall back to the type's zero-value to keep the JSON parseable.
        v = isEmpty ? DEFAULTS_BY_TYPE[r.type] : r.value;
        break;
      default:
        v = JSON.stringify(r.value ?? '');
    }
    return `  ${k}: ${v}`;
  });
  return `{\n${pairs.join(',\n')}\n}`;
};

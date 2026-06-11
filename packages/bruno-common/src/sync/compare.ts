import { normalizeUrlPath } from './normalize';

interface RequestItem {
  name?: string;
  type?: string;
  request?: {
    method?: string;
    url?: string;
    params?: Array<{ name: string; value?: string; type?: string; enabled?: boolean }>;
    headers?: Array<{ name: string; value?: string; enabled?: boolean }>;
    body?: {
      mode?: string;
      json?: string;
      formUrlEncoded?: Array<{ name: string; value?: string }>;
      multipartForm?: Array<{ name: string; type?: string; value?: string }>;
      [key: string]: any;
    };
    auth?: {
      mode?: string;
      apikey?: { key?: string; placement?: string };
      oauth2?: { grantType?: string; scope?: string; authorizationUrl?: string; accessTokenUrl?: string; [key: string]: any };
      [key: string]: any;
    };
    [key: string]: any;
  };
  items?: RequestItem[];
  [key: string]: any;
}

interface SpecItemsMapEntry extends RequestItem {
  folderName: string | null;
}

interface CompareResult {
  hasDiff: boolean;
  changes: string[];
}

/**
 * Flatten a Bruno collection's items into a Map keyed by endpoint ID (METHOD:normalizedPath).
 * Each value includes the original item plus the parent folderName.
 */
export const buildSpecItemsMap = (collectionItems: RequestItem[]): Map<string, SpecItemsMapEntry> => {
  const map = new Map<string, SpecItemsMapEntry>();
  const flatten = (items: RequestItem[], parentFolder: string | null = null) => {
    for (const item of items) {
      if (item.type === 'folder' && item.items) {
        flatten(item.items, item.name || null);
      } else if (item.request) {
        const method = item.request.method?.toUpperCase() || 'GET';
        const urlPath = normalizeUrlPath(item.request.url || '');
        const id = `${method}:${urlPath}`;
        map.set(id, { ...item, folderName: parentFolder });
      }
    }
  };
  flatten(collectionItems);
  return map;
};

/**
 * Recursively extracts all key paths from a parsed JSON value (dot-notation).
 * Used to compare JSON body structure/schema without comparing values.
 */
export const extractJsonKeys = (obj: any, prefix: string = ''): string[] => {
  const keys: string[] = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const key of Object.keys(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      keys.push(fullKey);
      keys.push(...extractJsonKeys(obj[key], fullKey));
    }
  } else if (Array.isArray(obj) && obj.length > 0) {
    // Only inspect first element (spec arrays always have one template item)
    keys.push(...extractJsonKeys(obj[0], `${prefix}[]`));
  }
  return keys;
};

/**
 * Compare two Bruno-format requests field-by-field.
 * Returns { hasDiff, changes } where changes is an array of human-readable strings.
 */
export const compareRequestFields = (specRequest: any, actualRequest: any): CompareResult => {
  // Compare parameters by name:type pairs (catches query<->path type changes)
  const specParamKeys = (specRequest.params || []).map((p: any) => `${p.name}:${p.type || 'query'}`).sort();
  const actualParamKeys = (actualRequest.params || []).map((p: any) => `${p.name}:${p.type || 'query'}`).sort();

  // Compare headers (by name)
  const specHeaderNames = (specRequest.headers || []).map((h: any) => h.name).sort();
  const actualHeaderNames = (actualRequest.headers || []).map((h: any) => h.name).sort();

  // Check for differences
  const paramsDiff = JSON.stringify(specParamKeys) !== JSON.stringify(actualParamKeys);
  const headersDiff = JSON.stringify(specHeaderNames) !== JSON.stringify(actualHeaderNames);

  // Check body mode difference
  const specBodyMode = specRequest.body?.mode || 'none';
  const actualBodyMode = actualRequest.body?.mode || 'none';
  const bodyDiff = specBodyMode !== actualBodyMode;

  // Check auth mode difference
  const specAuthMode = specRequest.auth?.mode || 'none';
  const actualAuthMode = actualRequest.auth?.mode || 'none';
  const authDiff = specAuthMode !== actualAuthMode;

  // Check auth config differences when auth modes match
  let authConfigDiff = false;
  if (!authDiff && specAuthMode !== 'none' && specAuthMode !== 'inherit') {
    if (specAuthMode === 'apikey') {
      const specApikey = specRequest.auth?.apikey || {};
      const actualApikey = actualRequest.auth?.apikey || {};
      authConfigDiff = specApikey.key !== actualApikey.key || specApikey.placement !== actualApikey.placement;
    } else if (specAuthMode === 'oauth2') {
      const specOauth2 = specRequest.auth?.oauth2 || {};
      const actualOauth2 = actualRequest.auth?.oauth2 || {};
      const grantType = specOauth2.grantType || actualOauth2.grantType;
      const commonFields = ['grantType', 'scope'];
      const grantTypeFields: Record<string, string[]> = {
        authorization_code: [...commonFields, 'authorizationUrl', 'accessTokenUrl'],
        implicit: [...commonFields, 'authorizationUrl'],
        password: [...commonFields, 'accessTokenUrl'],
        client_credentials: [...commonFields, 'accessTokenUrl']
      };
      const fields = grantTypeFields[grantType] || commonFields;
      authConfigDiff = fields.some((field) => specOauth2[field] !== actualOauth2[field]);
    }
  }

  // Check form field names when body modes match and mode is form-based
  let formFieldsDiff = false;
  let specFormFieldNames: string[] = [];
  let actualFormFieldNames: string[] = [];
  if (!bodyDiff && (specBodyMode === 'formUrlEncoded' || specBodyMode === 'multipartForm')) {
    if (specBodyMode === 'multipartForm') {
      specFormFieldNames = (specRequest.body?.multipartForm || []).map((f: any) => `${f.name}:${f.type || 'text'}`).sort();
      actualFormFieldNames = (actualRequest.body?.multipartForm || []).map((f: any) => `${f.name}:${f.type || 'text'}`).sort();
    } else {
      specFormFieldNames = (specRequest.body?.formUrlEncoded || []).map((f: any) => f.name).sort();
      actualFormFieldNames = (actualRequest.body?.formUrlEncoded || []).map((f: any) => f.name).sort();
    }
    formFieldsDiff = JSON.stringify(specFormFieldNames) !== JSON.stringify(actualFormFieldNames);
  }

  // Check JSON body structure when both sides use json mode
  let jsonBodyDiff = false;
  if (!bodyDiff && specBodyMode === 'json') {
    try {
      const specJson = specRequest.body?.json ? JSON.parse(specRequest.body.json) : null;
      const actualJson = actualRequest.body?.json ? JSON.parse(actualRequest.body.json) : null;
      if (specJson !== null && actualJson !== null) {
        const specKeys = extractJsonKeys(specJson).sort();
        const actualKeys = extractJsonKeys(actualJson).sort();
        jsonBodyDiff = JSON.stringify(specKeys) !== JSON.stringify(actualKeys);
      } else if ((specJson === null) !== (actualJson === null)) {
        jsonBodyDiff = true;
      }
    } catch (e) {
      // Malformed JSON — skip structural comparison
    }
  }

  const hasDiff = paramsDiff || headersDiff || bodyDiff || authDiff || authConfigDiff || formFieldsDiff || jsonBodyDiff;

  const changes: string[] = [];
  if (hasDiff) {
    if (paramsDiff) {
      const addedParams = actualParamKeys.filter((p: string) => !specParamKeys.includes(p));
      const removedParams = specParamKeys.filter((p: string) => !actualParamKeys.includes(p));
      if (addedParams.length) changes.push(`+${addedParams.length} params`);
      if (removedParams.length) changes.push(`-${removedParams.length} params`);
    }
    if (headersDiff) {
      const addedHeaders = actualHeaderNames.filter((h: string) => !specHeaderNames.includes(h));
      const removedHeaders = specHeaderNames.filter((h: string) => !actualHeaderNames.includes(h));
      if (addedHeaders.length) changes.push(`+${addedHeaders.length} headers`);
      if (removedHeaders.length) changes.push(`-${removedHeaders.length} headers`);
    }
    if (bodyDiff) changes.push(`body: ${actualBodyMode}`);
    if (authDiff) changes.push(`auth: ${actualAuthMode}`);
    if (authConfigDiff) changes.push('auth config');
    if (formFieldsDiff) {
      const addedFields = actualFormFieldNames.filter((f: string) => !specFormFieldNames.includes(f));
      const removedFields = specFormFieldNames.filter((f: string) => !actualFormFieldNames.includes(f));
      if (addedFields.length) changes.push(`+${addedFields.length} form fields`);
      if (removedFields.length) changes.push(`-${removedFields.length} form fields`);
    }
    if (jsonBodyDiff) changes.push('body schema');
  }

  return { hasDiff, changes };
};

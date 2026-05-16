interface NameValueItem {
  name: string;
  value?: string;
  enabled?: boolean;
  [key: string]: any;
}

/**
 * Merge spec params/headers with existing user values.
 * Matches by name + value to correctly handle enum-expanded params (multiple entries with same name).
 * Only preserves the user's enabled state; values come from the spec.
 */
export const mergeWithUserValues = (specItems: NameValueItem[], existingItems: NameValueItem[]): NameValueItem[] => {
  return (specItems || []).map((specItem) => {
    const existing = (existingItems || []).find(
      (e) => e.name === specItem.name && e.value === specItem.value
    );
    return existing ? { ...specItem, enabled: existing.enabled } : specItem;
  });
};

/**
 * Merge a spec item into an existing request, preserving collection-specific data
 * (tests, scripts, assertions) and user values for matching params/headers.
 *
 * fullReset: true = spec replaces entire request section (reset mode)
 *            false = only override url/body/auth from spec (sync mode)
 */
export const mergeSpecIntoRequest = (existingRequest: any, specItem: any, { fullReset = false } = {}): any => {
  const mergedParams = mergeWithUserValues(specItem.request.params, existingRequest.request?.params);
  const mergedHeaders = mergeWithUserValues(specItem.request.headers, existingRequest.request?.headers);

  if (fullReset) {
    return {
      ...existingRequest,
      request: {
        ...existingRequest.request,
        url: specItem.request.url,
        method: specItem.request.method,
        body: specItem.request.body,
        auth: specItem.request.auth,
        docs: specItem.request.docs,
        params: mergedParams || [],
        headers: mergedHeaders || []
      }
    };
  }

  return {
    ...existingRequest,
    request: {
      ...existingRequest.request,
      url: specItem.request.url,
      body: specItem.request.body,
      auth: specItem.request.auth,
      params: mergedParams || existingRequest.request?.params || [],
      headers: mergedHeaders || existingRequest.request?.headers || []
    }
  };
};

type ResponseLike = {
  headers?: Record<string, unknown> | null;
  request?: { res?: { rawHeaders?: string[] } | null } | null;
};

/**
 * axios deletes content-encoding from response.headers after it decompresses the body.
 * Restore it from the raw socket headers so the user sees what the server sent.
 */
export const restoreContentEncodingHeader = (response?: ResponseLike | null): void => {
  const headers = response?.headers;
  const rawHeaders = response?.request?.res?.rawHeaders;
  if (!headers || !rawHeaders || headers['content-encoding'] !== undefined) {
    return;
  }

  for (let i = 0; i < rawHeaders.length; i += 2) {
    if (rawHeaders[i].toLowerCase() === 'content-encoding') {
      headers['content-encoding'] = rawHeaders[i + 1];
      return;
    }
  }
};

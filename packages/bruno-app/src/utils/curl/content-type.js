const normalizeContentType = (contentType) => {
  if (!contentType || typeof contentType !== 'string') {
    return '';
  }

  return contentType.toLowerCase();
};

export const isNDJsonLikeContentType = (contentType) => {
  const normalized = normalizeContentType(contentType);
  return normalized.includes('application/x-ndjson') || normalized.includes('application/ndjson');
};

export const isJsonLikeContentType = (contentType) => {
  const normalized = normalizeContentType(contentType);

  return normalized.includes('application/json') || normalized.includes('+json');
};

export const isXmlLikeContentType = (contentType) => {
  const normalized = normalizeContentType(contentType);

  return normalized.includes('application/xml') || normalized.includes('+xml') || normalized.includes('text/xml');
};

export const isPlainTextContentType = (contentType) => {
  const normalized = normalizeContentType(contentType);

  return normalized.includes('text/plain');
};

export const isStructuredContentType = (contentType) => {
  return isNDJsonLikeContentType(contentType) || isJsonLikeContentType(contentType) || isXmlLikeContentType(contentType) || isPlainTextContentType(contentType);
};

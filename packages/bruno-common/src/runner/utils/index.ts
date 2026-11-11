export const encodeBase64 = (str: string) => {
  const bytes = new TextEncoder().encode(str);
  const binary = bytes.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
  return btoa(binary);
};

export const decodeBase64 = (base64: string) => {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const getContentType = (headers: Record<string, string | number | undefined>): string => {
  if (!headers || typeof headers !== 'object') {
    return '';
  }
  const contentType = Object.entries(headers)
    .find(([key]) => key.toLowerCase() === 'content-type')?.[1];
  return typeof contentType === 'string' ? contentType : '';
};

export const isHtmlContentType = (contentType: string) => {
  return contentType?.includes('html');
};

export const extractMimeType = (contentType: string = ''): string => {
  const cleaned = String(contentType || '').trim().toLowerCase();
  const match = cleaned.match(/^[^;\s]+/);
  return match ? match[0] : cleaned;
};

export const isBinaryContentType = (contentType: string = ''): boolean => {
  const mime = extractMimeType(contentType);
  if (!mime) {
    return false;
  }

  // XML and JSON subtypes (e.g. image/svg+xml, application/problem+json) are text, not binary
  if (mime.endsWith('+xml') || mime.endsWith('+json')) {
    return false;
  }

  return (
    mime.startsWith('image/')
    || mime.startsWith('audio/')
    || mime.startsWith('video/')
    || mime === 'application/pdf'
    || mime === 'application/zip'
    || mime === 'application/gzip'
    || mime === 'application/x-zip-compressed'
    || mime === 'application/x-tar'
    || mime === 'application/x-gzip'
    || mime === 'application/x-bzip2'
    || mime === 'application/x-7z-compressed'
    || mime === 'application/x-rar-compressed'
    || mime === 'application/octet-stream'
    || mime === 'application/msword'
    || mime.startsWith('application/vnd.openxmlformats-officedocument.')
    || mime.startsWith('application/vnd.ms-')
    || mime.startsWith('application/vnd.oasis.opendocument.')
    || mime === 'application/wasm'
    || mime === 'application/x-protobuf'
    || mime === 'application/protobuf'
    || mime.endsWith('+zip')
    || mime === 'application/vnd.apache.parquet'
    || mime.startsWith('application/vnd.apache.arrow')
    || mime === 'application/x-apache-arrow'
  );
};

export const redactBinaryData = (data: string | object | number | boolean, contentType: string) => {
  if (!data || !contentType) {
    return data;
  }

  const mime = extractMimeType(contentType);

  // SVG is XML text and should not be redacted
  if (mime.endsWith('+xml') || mime.endsWith('+json')) {
    return data;
  }

  if (mime.startsWith('image/')) {
    return 'Response content redacted (image data)';
  }

  if (isBinaryContentType(contentType)) {
    return 'Response content redacted (binary data)';
  }

  return data;
};

export const redactImageData = (data: string | object | number | boolean, contentType: string) => {
  return redactBinaryData(data, contentType);
};

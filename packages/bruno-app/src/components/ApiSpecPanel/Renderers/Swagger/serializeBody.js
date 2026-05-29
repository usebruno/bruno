// Serializes a SwaggerUI fetch body for transport across the renderer ↔ main
// IPC bridge in `renderer:swagger-fetch`. Only types that survive Electron's
// structured-clone serialization (and that our axios bridge knows how to send
// as an HTTP body) are supported. Multipart / binary types throw so the user
// gets a clear message in the SwaggerUI response panel instead of a silent
// failure.

const detectBodyType = (body) => {
  if (body == null) return 'null';
  if (typeof body === 'string') return 'string';
  if (typeof FormData !== 'undefined' && body instanceof FormData) return 'FormData';
  if (typeof File !== 'undefined' && body instanceof File) return 'File';
  if (typeof Blob !== 'undefined' && body instanceof Blob) return 'Blob';
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return 'URLSearchParams';
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) return 'ArrayBuffer';
  if (ArrayBuffer.isView && ArrayBuffer.isView(body)) return body.constructor?.name || 'TypedArray';
  if (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream) return 'ReadableStream';
  return typeof body;
};

export const UNSUPPORTED_BODY_TYPE_CODE = 'UNSUPPORTED_BODY_TYPE';

export const UNSUPPORTED_BODY_MESSAGE = (typeName) =>
  `Request body type "${typeName}" isn't supported in Swagger Try-it-out yet. `
  + `Supported types: JSON, URL-encoded forms, plain text. `
  + `Use a Bruno request for file uploads / binary bodies.`;

// Build a TypeError that carries the detected type as a property so downstream
// catchers can branch on `err.code` / `err.bodyType` instead of regex-parsing
// the message. Mirrors the IPC-error preservation pattern used in index.js.
const unsupportedBodyError = (typeName) => {
  const err = new TypeError(UNSUPPORTED_BODY_MESSAGE(typeName));
  err.code = UNSUPPORTED_BODY_TYPE_CODE;
  err.bodyType = typeName;
  return err;
};

export const serializeBody = (body) => {
  const typeName = detectBodyType(body);

  switch (typeName) {
    case 'null':
      return undefined;
    case 'string':
      return body;
    case 'URLSearchParams':
      return body.toString();
    case 'FormData':
    case 'File':
    case 'Blob':
    case 'ArrayBuffer':
    case 'ReadableStream':
      throw unsupportedBodyError(typeName);
    default:
      // TypedArrays land here (Uint8Array, etc.) — also unsupported by the bridge.
      if (ArrayBuffer.isView && ArrayBuffer.isView(body)) {
        throw unsupportedBodyError(typeName);
      }
      // Plain objects, numbers, booleans — pass through. SwaggerUI rarely sends
      // these as body directly (it stringifies JSON before fetch), but keep the
      // path open rather than rejecting unexpectedly.
      return body;
  }
};

class ResponseBodyError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ResponseBodyError';
    this.code = code;
  }
}

class BodyNotFoundError extends ResponseBodyError {
  constructor(bodyRef) {
    super(`Response body not found: ${bodyRef}`, 'BODY_NOT_FOUND');
    this.name = 'BodyNotFoundError';
    this.bodyRef = bodyRef;
  }
}

class BodyTooLargeForScriptsError extends ResponseBodyError {
  constructor(bodyRef, size) {
    super(
      `Response body is file-backed (${size} bytes) and cannot be loaded into scripts. Download the response instead.`,
      'BODY_TOO_LARGE_FOR_SCRIPTS'
    );
    this.name = 'BodyTooLargeForScriptsError';
    this.bodyRef = bodyRef;
    this.size = size;
  }
}

class BodyTooLargeForViewError extends ResponseBodyError {
  constructor(bodyRef, size, maxBytes) {
    super(
      `Response body is too large to view in-app (${size} bytes; max ${maxBytes}). Download the response instead.`,
      'BODY_TOO_LARGE_FOR_VIEW'
    );
    this.name = 'BodyTooLargeForViewError';
    this.bodyRef = bodyRef;
    this.size = size;
    this.maxBytes = maxBytes;
  }
}

module.exports = {
  ResponseBodyError,
  BodyNotFoundError,
  BodyTooLargeForScriptsError,
  BodyTooLargeForViewError
};

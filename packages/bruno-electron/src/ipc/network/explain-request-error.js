const getErrorCode = (error) =>
  (error && (error.code || (error.cause && error.cause.code))) || '';

const getErrorMessage = (error) => {
  if (!error) return '';

  const message = error.message ? String(error.message).trim() : '';

  // Axios may hide the underlying error behind a generic "Network Error".
  if (message && !/^network error$/i.test(message)) {
    return message;
  }

  if (error.cause && error.cause.message) {
    return String(error.cause.message).trim();
  }

  return message;
};

// Rules are checked in order; the first match wins.
const ERROR_RULES = [
  {
    test: (errorText) => /no_application_protocol|alpn/.test(errorText),
    message:
      'The server did not agree to HTTP/2 during the TLS handshake (ALPN). It most likely only supports HTTP/1.1 — set the HTTP version to Auto or HTTP/1.1.'
  },
  {
    test: (errorText) => /econnrefused/.test(errorText),
    message:
      'Connection refused — nothing is accepting connections at that host and port. Check the server is running and the URL/port are correct.'
  },
  {
    test: (errorText) => /enotfound|eai_again|getaddrinfo/.test(errorText),
    message:
      'DNS lookup failed — the hostname could not be resolved. Check the URL for typos and your network/DNS.'
  },
  {
    test: (errorText) => /etimedout|esockettimedout|timed out/.test(errorText),
    message:
      'The request timed out before it completed. The server may be slow or unreachable, or the timeout is set too low.'
  },
  {
    test: (errorText) => /econnreset|socket hang up/.test(errorText),
    message:
      'The connection was closed unexpectedly by the server (reset). For a mutual-TLS server this usually means no valid client certificate was presented.'
  },
  {
    test: (errorText) => /depth_zero_self_signed_cert|self_signed_cert_in_chain|self[-\s]?signed certificate/.test(errorText),
    message:
      'The server\'s TLS certificate is self-signed or issued by an untrusted CA. Add the CA in Preferences, or turn off SSL/TLS certificate verification.'
  },
  {
    test: (errorText) => /unable_to_verify_leaf_signature|unable_to_get_issuer_cert/.test(errorText),
    message:
      'The server\'s TLS certificate chain could not be verified (missing or unknown CA). Add the CA in Preferences, or turn off SSL/TLS certificate verification.'
  },
  {
    test: (errorText) => /cert_has_expired/.test(errorText),
    message: 'The server\'s TLS certificate has expired.'
  },
  {
    test: (errorText) => /err_tls_cert_altname_invalid|hostname\/ip does not match/.test(errorText),
    message: 'The server\'s TLS certificate does not match the hostname in the URL.'
  },
  {
    test: (errorText) => /nghttp2_refused_stream/.test(errorText),
    message:
      'The server refused the HTTP/2 stream (it may be draining via GOAWAY, overloaded, or rejecting new requests). It is usually safe to retry.'
  },
  {
    test: (errorText) => /nghttp2_enhance_your_calm/.test(errorText),
    message:
      'The server is rate-limiting the connection (HTTP/2 ENHANCE_YOUR_CALM). Reduce the request rate or the number of concurrent streams.'
  },
  {
    test: (errorText) => /nghttp2_frame_size_error/.test(errorText),
    message:
      'An HTTP/2 frame exceeded the size the server allows (often oversized request or response headers).'
  },
  {
    test: (errorText) => /nghttp2_protocol_error/.test(errorText),
    message:
      'The server reported an HTTP/2 protocol error (a malformed frame or an invalid response, e.g. a Content-Length that does not match the body).'
  },
  {
    test: (errorText) => /nghttp2_internal_error/.test(errorText),
    message: 'The server reset the HTTP/2 stream with an internal error.'
  },
  {
    test: (errorText) => /session (?:has been |was )?destroyed/.test(errorText),
    message: 'The HTTP/2 session was torn down before the response was received.'
  },
  {
    test: (errorText) => /407|proxy authentication required/.test(errorText),
    message:
      'The proxy rejected the request — authentication is required or the proxy credentials are wrong.'
  }
];

/**
 * Explain common request errors in plain language while preserving
 * the original error message and code for debugging.
 */
const explainRequestError = (error) => {
  const code = String(getErrorCode(error) || '');
  const originalMessage = String(getErrorMessage(error) || '');
  const errorText = `${code} ${originalMessage}`.toLowerCase();

  for (const rule of ERROR_RULES) {
    if (rule.test(errorText)) {
      return {
        message: rule.message,
        originalMessage,
        code
      };
    }
  }

  return {
    message: null,
    originalMessage,
    code
  };
};

module.exports = { explainRequestError };

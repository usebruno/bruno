/**
 * Pure helpers for deriving the gRPC URL scheme / TLS state.
 *
 * TLS in Bruno is determined entirely by the URL scheme:
 *   grpc://  -> plaintext (insecure)
 *   grpcs:// -> TLS (secure)
 *
 * When no scheme is present, Bruno's network layer infers one from the host
 * (localhost / 127.0.0.1 -> insecure, any other host -> secure). These helpers
 * mirror that inference so the lock indicator in the URL bar always matches the
 * connection that will actually be made. See usebruno/bruno#6950.
 */

const SCHEME_REGEX = /^(grpc|grpcs|http|https):\/\//i;
const SECURE_SCHEME_REGEX = /^(grpcs|https):\/\//i;
const VARIABLE_PREFIX_REGEX = /^\s*\{\{/;

/**
 * Mirrors the backend's host check: localhost is treated as plaintext by default.
 */
export const isLocalGrpcHost = (url = '') => {
  const value = url.trim().replace(SCHEME_REGEX, '');
  if (!value || VARIABLE_PREFIX_REGEX.test(value)) {
    return false;
  }

  const hostWithPort = value.split(/[/?#]/)[0];
  const bracketedIpv6End = hostWithPort.startsWith('[') ? hostWithPort.indexOf(']') : -1;
  const hostname = (
    bracketedIpv6End > -1
      ? hostWithPort.slice(1, bracketedIpv6End)
      : hostWithPort.split(':')[0]
  ).toLowerCase();

  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
};

/**
 * True if the URL begins with a Bruno variable (e.g. {{baseUrl}}). In that case
 * the scheme can't be known statically, so it must not be rewritten.
 */
export const startsWithVariable = (url = '') => VARIABLE_PREFIX_REGEX.test(url);

/**
 * True if the URL carries an explicit grpc/grpcs/http/https scheme.
 */
export const hasExplicitGrpcScheme = (url = '') => SCHEME_REGEX.test(url.trim());

/**
 * Effective TLS state of a URL. An explicit scheme always wins; otherwise the
 * backend's host-based default is mirrored (remote -> secure, local -> insecure).
 */
export const isSecureGrpcUrl = (url = '') => {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return false;
  if (SECURE_SCHEME_REGEX.test(trimmedUrl)) return true;
  if (SCHEME_REGEX.test(trimmedUrl)) return false; // explicit grpc:// or http://
  if (startsWithVariable(trimmedUrl)) return false; // unknown until resolved
  return !isLocalGrpcHost(trimmedUrl);
};

/**
 * Strip a leading scheme for display in the URL editor, so the
 * scheme is controlled by the lock toggle instead of being typed by hand.
 */
export const getDisplayGrpcUrl = (url = '') => url.replace(SCHEME_REGEX, '');

/**
 * True when a gRPC URL has a host-like value after stripping the transport
 * scheme. Used to avoid reflection attempts for scheme-only values like
 * grpc:// or grpcs://.
 */
export const hasGrpcUrlHost = (url = '') => Boolean(getDisplayGrpcUrl(url).trim());

/**
 * Apply the chosen scheme to a URL. A leading scheme is replaced; otherwise the
 * scheme is prepended — including for variable-leading hosts (e.g. {{baseUrl}}),
 * since grpc://{{baseUrl}} is a valid, explicit choice. (The only unguardable
 * case is a variable whose value already contains a scheme, which is unusual.)
 */
export const setGrpcUrlSecureScheme = (url = '', secure = false) => {
  const trimmedUrl = url.trim();
  const scheme = secure ? 'grpcs://' : 'grpc://';

  if (!trimmedUrl) return scheme;

  if (SCHEME_REGEX.test(trimmedUrl)) {
    return trimmedUrl.replace(SCHEME_REGEX, scheme);
  }
  return `${scheme}${trimmedUrl}`;
};

/**
 * Decide whether a typed URL should be normalized to an explicit scheme.
 * Priority: a scheme typed/pasted in the new value wins; otherwise the
 * previously chosen explicit scheme is preserved. If neither side has an
 * explicit scheme, return undefined so the URL can remain backend-inferred until
 * the user makes an explicit TLS choice with the lock toggle.
 */
export const resolveSecureForInput = (storedUrl = '', inputValue = '') => {
  if (hasExplicitGrpcScheme(inputValue)) return isSecureGrpcUrl(inputValue);
  if (hasExplicitGrpcScheme(storedUrl)) return isSecureGrpcUrl(storedUrl);
  return undefined;
};

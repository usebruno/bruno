// Replaced external 'is-ip' (ESM) with lightweight internal helpers to keep CJS bundle compatible.

const isIPv4 = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;
  const parts = input.split('.');
  if (parts.length !== 4) return false;
  return parts.every(p => {
    if (!/^\d+$/.test(p)) return false;
    if (p.length > 1 && p.startsWith('0')) return false; // disallow leading zeros
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
};

const isIPv6 = (input: string): boolean => {
  if (!input || typeof input !== 'string') return false;
  // Basic IPv6 validation – compressed & full forms. This is intentionally minimal.
  // Reject if contains invalid chars
  if (!/^[0-9a-fA-F:]+$/.test(input)) return false;
  // Must have at least 2 colons
  if ((input.match(/:/g) || []).length < 2) return false;
  // Handle :: compression (only one allowed)
  if ((input.match(/::/g) || []).length > 1) return false;
  const withoutEmptyCompression = input.replace(/::/, ':placeholder:');
  const segments = withoutEmptyCompression.split(':');
  if (segments.length < 3 || segments.length > 8) return false;
  return segments.every(seg => seg === 'placeholder' || (seg.length > 0 && seg.length <= 4));
};

const isIP = (input: string): boolean => isIPv4(input) || isIPv6(input);

const hostNoBrackets = (host: string): string => {
  if (host.length >= 2 && host.startsWith('[') && host.endsWith(']')) {
    return host.substring(1, host.length - 1);
  }
  return host;
};

const isLoopbackV4 = (address: string): boolean => {
  const octets = address.split('.');
  if (octets.length !== 4 || parseInt(octets[0], 10) !== 127) {
    return false;
  }
  return octets.every((octet) => {
    const n = parseInt(octet, 10);
    return !Number.isNaN(n) && n >= 0 && n <= 255;
  });
};

const isLoopbackV6 = (address: string): boolean => address === '::1';

const isIpLoopback = (address: string): boolean => {
  if (isIPv4(address)) {
    return isLoopbackV4(address);
  }
  if (isIPv6(address)) {
    return isLoopbackV6(address);
  }
  return false;
};

const isNormalizedLocalhostTLD = (host: string): boolean => host.toLowerCase().endsWith('.localhost');

const isLocalHostname = (host: string): boolean => {
  return host.toLowerCase() === 'localhost' || isNormalizedLocalhostTLD(host);
};

/**
 * Mirrors Chrome / Secure Contexts spec for "potentially trustworthy origins".
 */
const isPotentiallyTrustworthyOrigin = (urlString: string): boolean => {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false; // invalid URL or opaque origin
  }

  const scheme = url.protocol.replace(':', '').toLowerCase();
  const hostname = hostNoBrackets(url.hostname).replace(/\.+$/, '');

  // Secure schemes
  if (scheme === 'https' || scheme === 'wss' || scheme === 'file') {
    return true;
  }

  // IP literals
  if (isIP(hostname)) {
    return isIpLoopback(hostname);
  }

  // localhost / *.localhost
  return isLocalHostname(hostname);
};

export { isPotentiallyTrustworthyOrigin }; 
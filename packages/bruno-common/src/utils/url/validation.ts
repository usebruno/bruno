import { isIPv4, isIPv6 } from 'is-ip';

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
  if (isIPv4(hostname) || isIPv6(hostname)) {
    return isIpLoopback(hostname);
  }

  // localhost / *.localhost
  return isLocalHostname(hostname);
};

export { isPotentiallyTrustworthyOrigin }; 
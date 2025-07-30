const hostNoBrackets = (host: string): string => {
  if (host.length >= 2 && host.startsWith('[') && host.endsWith(']')) {
    return host.substring(1, host.length - 1);
  }
  return host;
};

// Strict IPv4 and IPv6 validation regexes
export const ipv4: RegExp = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
export const ipv6: RegExp = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})$/;

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

const isLoopbackV6 = (address: string): boolean => {
  // new URL(...) follows the WHATWG URL Standard
  // which compresses IPv6 addresses, therefore the IPv6
  // loopback address will always be compressed to '[::1]':
  // https://url.spec.whatwg.org/#concept-ipv6-serializer
  return (address === '::1');
}
const isIpLoopback = (address: string): boolean => {
  if (ipv4.test(address)) {
    return isLoopbackV4(address);
  }
  if (ipv6.test(address)) {
    return isLoopbackV6(address);
  }
  return false;
};

const isNormalizedLocalhostTLD = (host: string): boolean => {
  return host.toLowerCase().endsWith('.localhost');
};

const isLocalHostname = (host: string): boolean => {
  return host.toLowerCase() === 'localhost' || isNormalizedLocalhostTLD(host);
};


const isPotentiallyTrustworthyOrigin = (urlString: string): boolean => {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    return false; // invalid or opaque origin
  }

  const scheme = url.protocol.replace(':', '').toLowerCase();
  const hostname = hostNoBrackets(url.hostname).replace(/\.+$/, '');

  // Secure schemes are always trustworthy
  if (scheme === 'https' || scheme === 'wss' || scheme === 'file') {
    return true;
  }

  // If it's an IP literal, check loopback
  if (ipv4.test(hostname) || ipv6.test(hostname)) {
    return isIpLoopback(hostname);
  }

  // RFC 6761: localhost names map to loopback
  return isLocalHostname(hostname);
};

export {
  isPotentiallyTrustworthyOrigin,
}; 
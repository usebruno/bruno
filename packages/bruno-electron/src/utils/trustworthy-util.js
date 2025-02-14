const { URL } = require('url');
const net = require('net');

const isLoopbackV4 = (address) => {
  // 127.0.0.0/8: first octet = 127
  const octets = address.split('.');
  return (
    octets.length === 4
  ) && parseInt(octets[0], 10) === 127;
}

const isLoopbackV6 = (address) => {
  // new URL(...) follows the WHATWG URL Standard
  // which compresses IPv6 addresses, therefore the IPv6
  // loopback address will always be compressed to '[::1]':
  // https://url.spec.whatwg.org/#concept-ipv6-serializer
  return (address === '::1');
}

const isIpLoopback = (address) => {
  if (net.isIPv4(address)) {
    return isLoopbackV4(address);
  }

  if (net.isIPv6(address)) {
    return isLoopbackV6(address);
  }

  return false;
}

const isNormalizedLocalhostTLD = (host) => {
  return host.toLowerCase().endsWith('.localhost');
}

const isLocalHostname = (host) => {
  return host.toLowerCase() === 'localhost' ||
    isNormalizedLocalhostTLD(host);
}

/**
 * Removes leading and trailing square brackets if present.
 * Adapted from https://github.com/chromium/chromium/blob/main/url/gurl.cc#L440-L448
 *
 * @param {string} host
 * @returns {string}
 */
const hostNoBrackets = (host) => {
  if (host.length >= 2 && host.startsWith('[') && host.endsWith(']')) {
    return host.substring(1, host.length - 1);
  }
  return host;
}

/**
 * Determines if a URL string represents a potentially trustworthy origin.
 * 
 * A URL is considered potentially trustworthy if it:
 * - Uses HTTPS, WSS or file schemes
 * - Points to a loopback address (IPv4 127.0.0.0/8 or IPv6 ::1)
 * - Uses localhost or *.localhost hostnames
 * 
 * @param {string} urlString - The URL to check
 * @returns {boolean}
 * @see {@link https://w3c.github.io/webappsec-secure-contexts/#potentially-trustworthy-origin W3C Spec}
 */
const isPotentiallyTrustworthy = (urlString) => {
  let url;

  // try ... catch doubles as an opaque origin check
  try {
    url = new URL(urlString);
  } catch {
    return false;
  }

  const scheme = url.protocol.replace(':', '').toLowerCase();
  const hostname = hostNoBrackets(
    url.hostname
  ).replace(/\.+$/, '');

  if (
    scheme === 'https' ||
    scheme === 'wss' ||
    scheme === 'file' // https://w3c.github.io/webappsec-secure-contexts/#potentially-trustworthy-origin
  ) {
    return true;
  }

  // If it's already an IP literal, check if it's a loopback address
  if (net.isIP(hostname)) {
    return isIpLoopback(hostname);
  }

  // RFC 6761 states that localhost names will always resolve
  // to the respective IP loopback address:
  // https://datatracker.ietf.org/doc/html/rfc6761#section-6.3
  return isLocalHostname(hostname);
}

module.exports = {
    isPotentiallyTrustworthy
};
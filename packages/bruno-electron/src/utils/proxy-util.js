const parseUrl = require('url').parse;

const DEFAULT_PORTS = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};
/**
 * check for proxy bypass, copied form 'proxy-from-env'
 */
const shouldUseProxy = (url, proxyByPass) => {
  if (proxyByPass === '*') {
    return false; // Never proxy if wildcard is set.
  }

  if (!proxyByPass) {
    return true; // use proxy if enabled
  }

  const parsedUrl = typeof url === 'string' ? parseUrl(url) : url || {};
  let proto = parsedUrl.protocol;
  let hostname = parsedUrl.host;
  let port = parsedUrl.port;
  if (typeof hostname !== 'string' || !hostname || typeof proto !== 'string') {
    return false; // Don't proxy URLs without a valid scheme or host.
  }

  proto = proto.split(':', 1)[0];
  // Stripping ports in this way instead of using parsedUrl.hostname to make
  // sure that the brackets around IPv6 addresses are kept.
  hostname = hostname.replace(/:\d*$/, '');
  port = parseInt(port) || DEFAULT_PORTS[proto] || 0;

  return proxyByPass.split(/[,;\s]/).every(function (dontProxyFor) {
    if (!dontProxyFor) {
      return true; // Skip zero-length hosts.
    }
    const parsedProxy = dontProxyFor.match(/^(.+):(\d+)$/);
    let parsedProxyHostname = parsedProxy ? parsedProxy[1] : dontProxyFor;
    const parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
    if (parsedProxyPort && parsedProxyPort !== port) {
      return true; // Skip if ports don't match.
    }

    if (!/^[.*]/.test(parsedProxyHostname)) {
      // No wildcards, so stop proxying if there is an exact match.
      return hostname !== parsedProxyHostname;
    }

    if (parsedProxyHostname.charAt(0) === '*') {
      // Remove leading wildcard.
      parsedProxyHostname = parsedProxyHostname.slice(1);
    }
    // Stop proxying if the hostname ends with the no_proxy host.
    return !hostname.endsWith(parsedProxyHostname);
  });
};

module.exports = {
  shouldUseProxy
};

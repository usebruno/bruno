import { parse as parseUrl } from 'url';
import { isEmpty } from 'lodash';

const DEFAULT_PORTS: Record<string, number> = {
  ftp: 21,
  gopher: 70,
  http: 80,
  https: 443,
  ws: 80,
  wss: 443
};

export interface SystemProxyEnvVars {
  http_proxy?: string;
  https_proxy?: string;
  no_proxy?: string;
}

export const shouldUseProxy = (url: string, proxyBypass: string): boolean => {
  if (proxyBypass === '*') {
    return false;
  }

  if (!proxyBypass || typeof proxyBypass !== 'string' || isEmpty(proxyBypass.trim())) {
    return true;
  }

  const parsedUrl = typeof url === 'string' ? parseUrl(url) : url || {};
  let proto = parsedUrl.protocol;
  let hostname = parsedUrl.host;
  let port: string | number | null | undefined = parsedUrl.port;

  if (typeof hostname !== 'string' || !hostname || typeof proto !== 'string') {
    return false;
  }

  proto = proto.split(':', 1)[0];
  hostname = hostname.replace(/:\d*$/, '');
  port = parseInt(port as string) || DEFAULT_PORTS[proto] || 0;

  return proxyBypass.split(/[,;\s]/).every(function (dontProxyFor: string) {
    if (!dontProxyFor) {
      return true;
    }
    const parsedProxy = dontProxyFor.match(/^(.+):(\d+)$/);
    let parsedProxyHostname = parsedProxy ? parsedProxy[1] : dontProxyFor;
    const parsedProxyPort = parsedProxy ? parseInt(parsedProxy[2]) : 0;
    if (parsedProxyPort && parsedProxyPort !== port) {
      return true;
    }

    if (!/^[.*]/.test(parsedProxyHostname)) {
      return hostname !== parsedProxyHostname;
    }

    if (parsedProxyHostname.charAt(0) === '*') {
      parsedProxyHostname = parsedProxyHostname.slice(1);
    }
    return !hostname.endsWith(parsedProxyHostname);
  });
};

export const getSystemProxyEnvVariables = (): SystemProxyEnvVars => {
  const { http_proxy, HTTP_PROXY, https_proxy, HTTPS_PROXY, no_proxy, NO_PROXY } = process.env;
  return {
    http_proxy: http_proxy || HTTP_PROXY,
    https_proxy: https_proxy || HTTPS_PROXY,
    no_proxy: no_proxy || NO_PROXY
  };
};

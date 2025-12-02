const http = require('http');
const https = require('https');

const getRawQueryString = (url) => {
  const queryIndex = url.indexOf('?');
  return queryIndex !== -1 ? url.slice(queryIndex) : '';
};

const isAbsolutePath = (value) => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value);

const extractRawPath = (targetUrl) => {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return undefined;
  }

  const afterHost = targetUrl.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/]+/, '');
  if (afterHost === targetUrl) {
    return undefined;
  }

  const [pathAndQuery] = afterHost.split('#');
  const normalized = pathAndQuery?.length ? pathAndQuery : '/';

  return normalized.startsWith('/') ? normalized : `/${normalized}`;
};

const addQueryParamPreservingPath = (targetUrl, key, value, preserveDotSegments) => {
  if (!targetUrl || !key) {
    return targetUrl;
  }

  try {
    const urlObj = new URL(targetUrl);
    urlObj.searchParams.set(key, value);

    if (!preserveDotSegments) {
      return urlObj.toString();
    }

    const [urlWithoutHash, ...hashParts] = targetUrl.split('#');
    const hash = hashParts.length ? `#${hashParts.join('#')}` : '';
    const [pathPart] = urlWithoutHash.split('?');
    const queryString = urlObj.searchParams.toString();

    return `${pathPart}${queryString ? `?${queryString}` : ''}${hash}`;
  } catch (err) {
    // fall back to manual path handling
  }

  const [urlWithoutHash, ...hashParts] = targetUrl.split('#');
  const hash = hashParts.length ? `#${hashParts.join('#')}` : '';
  const [pathPart, rawQuery = ''] = urlWithoutHash.split('?');
  const params = new URLSearchParams(rawQuery);

  params.set(key, value);

  const queryString = params.toString();

  return `${pathPart}${queryString ? `?${queryString}` : ''}${hash}`;
};

const interpolatePathSegments = (segment, pathParams) => {
  if (segment.startsWith(':')) {
    const paramName = segment.slice(1);
    const existingPathParam = pathParams.find((param) => param.name === paramName);
    return existingPathParam ? existingPathParam.value : segment;
  }

  if (/^[A-Za-z0-9_.-]+\([^)]*\)$/.test(segment)) {
    const paramRegex = /[:](\w+)/g;
    let match;
    let result = segment;
    while ((match = paramRegex.exec(segment))) {
      if (match[1]) {
        let name = match[1].replace(/[')"`]+$/, '');
        name = name.replace(/^[('"`]+/, '');
        if (name) {
          const existingPathParam = pathParams.find((param) => param.name === name);
          if (existingPathParam) {
            result = result.replace(':' + match[1], existingPathParam.value);
          }
        }
      }
    }
    return result;
  }

  return segment;
};

const buildUrlWithPathParams = (targetUrl, pathParams, preserveDotSegments) => {
  if (!pathParams?.length) {
    return targetUrl;
  }

  let url = targetUrl;
  const urlSearchRaw = getRawQueryString(targetUrl);

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `http://${url}`;
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    const error = new Error('Invalid URL format');
    error.originalError = e.message;
    throw error;
  }

  if (!preserveDotSegments) {
    const urlPathnameInterpolatedWithPathParams = parsed.pathname
      .split('/')
      .filter((path) => path !== '')
      .map((path) => '/' + interpolatePathSegments(path, pathParams))
      .join('');

    const trailingSlash = parsed.pathname.endsWith('/') ? '/' : '';
    return parsed.origin + urlPathnameInterpolatedWithPathParams + trailingSlash + urlSearchRaw;
  }

  const origin = parsed.origin;
  const pathAndAfter = url.slice(origin.length) || '/';
  const pathname = (pathAndAfter.split(/[?#]/)[0] || '');
  const hasLeadingSlash = pathname.startsWith('/');
  const endsWithSlash = pathname.endsWith('/');
  const interpolatedSegments = pathname
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => interpolatePathSegments(segment, pathParams))
    .join('/');

  let rebuiltPath = interpolatedSegments;
  if (hasLeadingSlash) {
    rebuiltPath = `/${rebuiltPath}`;
  }
  if (!rebuiltPath && hasLeadingSlash) {
    rebuiltPath = '/';
  }
  if (endsWithSlash && rebuiltPath && !rebuiltPath.endsWith('/')) {
    rebuiltPath += '/';
  }

  return origin + rebuiltPath + urlSearchRaw;
};

const buildRawPathTransport = (targetUrl) => {
  const rawPath = extractRawPath(targetUrl);
  if (!rawPath) {
    return undefined;
  }

  let origin;
  try {
    origin = new URL(targetUrl).origin;
  } catch (err) {
    return undefined;
  }

  const [rawPathBase, rawPathQuery] = rawPath.split('?');

  return {
    request: (options, cb) => {
      const queryFromOptions = (() => {
        if (typeof options.path !== 'string') {
          return rawPathQuery ? `?${rawPathQuery}` : '';
        }

        const idx = options.path.indexOf('?');
        if (idx === -1) {
          return rawPathQuery ? `?${rawPathQuery}` : '';
        }

        return options.path.slice(idx);
      })();

      const rawPathWithQuery = `${rawPathBase}${queryFromOptions}`;
      const useProxyPath = isAbsolutePath(options.path) && origin;
      const nextPath = useProxyPath ? `${origin}${rawPathWithQuery}` : rawPathWithQuery;
      const isHttpsRequest = /^https:/.test(options.protocol || '');
      const transport = isHttpsRequest ? https : http;

      return transport.request({ ...options, path: nextPath }, cb);
    }
  };
};

module.exports = {
  addQueryParamPreservingPath,
  buildRawPathTransport,
  buildUrlWithPathParams
};

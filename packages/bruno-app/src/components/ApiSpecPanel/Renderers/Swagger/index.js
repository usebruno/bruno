import { memo } from 'react';
import SwaggerUI from 'swagger-ui-react';
import StyledWrapper from './StyledWrapper';
import { serializeBody } from './serializeBody';

const serializeHeaders = (headers) => {
  if (!headers) return {};
  if (typeof headers.entries === 'function') {
    const out = {};
    for (const [k, v] of headers.entries()) out[k] = v;
    return out;
  }
  return { ...headers };
};

const proxiedFetch = async (url, options = {}) => {
  const result = await window.ipcRenderer.invoke('renderer:swagger-fetch', {
    url,
    method: options.method || 'GET',
    headers: serializeHeaders(options.headers),
    body: serializeBody(options.body)
  });

  if (result.error) {
    const err = new TypeError(result.message);
    err.code = result.code;
    throw err;
  }

  // The Response constructor throws if a null-body status carries a body.
  const nullBodyStatus = [101, 204, 205, 304].includes(result.status);
  const bodyBytes = !nullBodyStatus && result.bodyBase64
    ? Uint8Array.from(atob(result.bodyBase64), (c) => c.charCodeAt(0))
    : null;

  // Build Headers manually so multi-value response headers (e.g. Set-Cookie,
  // which axios returns as string[]) end up as repeated entries rather than
  // joined via toString(). new Headers({ 'set-cookie': ['a','b'] }) coerces
  // the array to "a,b", which is invalid Set-Cookie syntax.
  const responseHeaders = new Headers();
  for (const [name, value] of Object.entries(result.headers || {})) {
    if (Array.isArray(value)) {
      value.forEach((v) => responseHeaders.append(name, String(v)));
    } else if (value != null) {
      responseHeaders.append(name, String(value));
    }
  }

  return new Response(bodyBytes, {
    status: result.status,
    statusText: result.statusText,
    headers: responseHeaders
  });
};

const requestInterceptor = (req) => {
  req.userFetch = proxiedFetch;
  return req;
};

const Swagger = ({ spec, onComplete }) => {
  return (
    <StyledWrapper>
      <div className="swagger-root w-full">
        <SwaggerUI
          spec={spec}
          onComplete={onComplete}
          requestInterceptor={requestInterceptor}
        />
      </div>
    </StyledWrapper>
  );
};

export default memo(Swagger);

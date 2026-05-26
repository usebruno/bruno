import { memo } from 'react';
import SwaggerUI from 'swagger-ui-react';
import StyledWrapper from './StyledWrapper';

const serializeHeaders = (headers) => {
  if (!headers) return {};
  if (typeof headers.entries === 'function') {
    const out = {};
    for (const [k, v] of headers.entries()) out[k] = v;
    return out;
  }
  return { ...headers };
};

const serializeBody = (body) => {
  if (body == null) return undefined;
  if (typeof body === 'string') return body;
  if (body instanceof URLSearchParams) return body.toString();
  // FormData / Blob / ArrayBuffer not yet supported by the IPC bridge.
  return body;
};

const proxiedFetch = async (url, options = {}) => {
  const result = await window.ipcRenderer.invoke('renderer:swagger-fetch', {
    url,
    method: options.method || 'GET',
    headers: serializeHeaders(options.headers),
    body: serializeBody(options.body)
  });

  if (result.error) {
    throw new TypeError(`${result.code}: ${result.message}`);
  }

  // The Response constructor throws if a null-body status carries a body.
  const nullBodyStatus = [101, 204, 205, 304].includes(result.status);
  const bodyBytes = !nullBodyStatus && result.bodyBase64
    ? Uint8Array.from(atob(result.bodyBase64), (c) => c.charCodeAt(0))
    : null;

  return new Response(bodyBytes, {
    status: result.status,
    statusText: result.statusText,
    headers: new Headers(result.headers || {})
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

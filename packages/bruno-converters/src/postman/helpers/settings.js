import { utils } from '@usebruno/common';

const { parseMaxRedirects } = utils;

// Maps v2.1 `protocolProfileBehavior` / v3 `settings`; `onWarning` gets each value that can't be imported.
export const toBrunoRequestSettings = (behavior, onWarning) => {
  const source = behavior && typeof behavior === 'object' ? behavior : {};

  const settings = {
    encodeUrl: source.disableUrlEncoding !== true,
    forwardAuthorizationHeader: source.followAuthorizationHeader ?? false
  };

  if (source.followRedirects !== undefined) {
    settings.followRedirects = source.followRedirects;
  }

  // Exports don't always honour the schema's number type; warn instead of failing the request.
  const maxRedirects = parseMaxRedirects(source.maxRedirects);
  if (maxRedirects !== undefined) {
    settings.maxRedirects = maxRedirects;
  } else if (source.maxRedirects !== undefined) {
    onWarning('Invalid maxRedirects, ignored (must be a number of 0 or more)');
  }

  const { disabledSystemHeaders } = source;
  if (disabledSystemHeaders && typeof disabledSystemHeaders === 'object') {
    const omitHeaders = Object.keys(disabledSystemHeaders)
      .filter((headerName) => disabledSystemHeaders[headerName] === true)
      .map((headerName) => headerName.trim())
      .filter((headerName) => headerName.length > 0);
    if (omitHeaders.length > 0) {
      settings.omitHeaders = omitHeaders;
    }
  }

  return settings;
};

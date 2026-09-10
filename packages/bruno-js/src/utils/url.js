/**
 * new URL() mangles {{var}} reference variables, so the url is split by hand. The comments
 * below show each step for 'https://user:pass@{{HOST}}/users/:id?role=admin#section'.
 */
const parseTemplatedUrl = (rawUrl) => {
  if (!rawUrl) {
    throw new Error('URL is empty');
  }

  // drop the protocol -> 'user:pass@{{HOST}}/users/:id?role=admin#section'
  let remainder = rawUrl.replace(/^[^/?#]*:\/\//, '');

  // a fragment belongs to no part of the url below, so drop it: 'user:pass@{{HOST}}/users/:id?role=admin'
  const fragmentIndex = remainder.indexOf('#');
  if (fragmentIndex !== -1) {
    remainder = remainder.substring(0, fragmentIndex);
  }

  // split into host and the rest: 'user:pass@{{HOST}}' and '/users/:id?role=admin'
  const [hostWithCredentials, ...rest] = remainder.split(/([/?])/);
  const restUrl = rest.join('');

  // credentials are not part of the host: 'user:pass@{{HOST}}' -> '{{HOST}}'
  const host = hostWithCredentials.substring(hostWithCredentials.lastIndexOf('@') + 1);

  // before the '?' is the path, after it the query: '/users/:id' and 'role=admin'
  const queryIndex = restUrl.indexOf('?');
  const path = queryIndex === -1 ? restUrl : restUrl.substring(0, queryIndex);
  const search = queryIndex === -1 ? '' : restUrl.substring(queryIndex + 1);

  return {
    host,
    pathname: path,
    search
  };
};

const parseUrl = (rawUrl) => {
  // Parse templated URLs manually to preserve the variable casing
  if (!rawUrl?.includes('{{')) {
    try {
      const url = new URL(rawUrl);
      return {
        host: url.host,
        pathname: url.pathname,
        search: url.search.replace(/^\?/, '')
      };
    } catch (e) {
      // not a url new URL() accepts
    }
  }

  return parseTemplatedUrl(rawUrl);
};

module.exports = {
  parseUrl,
  parseTemplatedUrl
};

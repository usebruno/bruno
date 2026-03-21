/**
 * Interpolate path params (:param) in pathname with values from pathParams.
 * @param {string} pathname - Path string (e.g. '/api/users/:userId')
 * @param {Array<{ name: string, value: string }>} pathParams - Path param definitions
 * @returns {string} Path with :param replaced by param.value
 */
const interpolatePathParams = (pathname, pathParams) => {
  if (!pathname || !pathParams || !Array.isArray(pathParams)) {
    return pathname;
  }
  return pathname
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        const paramName = segment.slice(1);
        const pathParam = pathParams.find((param) => param.name === paramName);
        if (pathParam != null && pathParam.value != null) {
          return pathParam.value;
        }
      }
      return segment;
    })
    .join('/');
};

module.exports = {
  interpolatePathParams
};

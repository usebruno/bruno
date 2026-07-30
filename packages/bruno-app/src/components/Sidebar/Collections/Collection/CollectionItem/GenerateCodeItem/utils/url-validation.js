import { isValidUrl, prependDefaultScheme } from 'utils/url/index';

const TEMPLATE_VAR_PATTERN = /\{\{([^}]+)\}\}/;
const TEMPLATE_VAR_PATTERN_GLOBAL = /\{\{[^}]*\}\}/g;
// Opaque enough that `new URL()` accepts it wherever a `{{var}}` may appear — as the scheme,
// inside the authority, or as a path segment.
const TEMPLATE_VAR_STAND_IN = 'bruno-template-var';

/**
 * Interpolation ON: the snippet shows resolved values, so a `{{var}}` that outlived
 * interpolation means the URL the user is about to copy is incomplete (BRU-2095).
 */
export const validateInterpolatedUrl = (url) => isValidUrl(url) && !TEMPLATE_VAR_PATTERN.test(url);

/**
 * Interpolation OFF: the snippet shows the URL as typed, so whether a variable resolves is
 * beside the point — only the URL's shape matters. Stand each `{{var}}` in for an opaque
 * token so `new URL()` can judge the rest of it.
 */
export const validateTemplateUrl = (url) => {
  if (!url) return false;

  return isValidUrl(prependDefaultScheme(url.replace(TEMPLATE_VAR_PATTERN_GLOBAL, TEMPLATE_VAR_STAND_IN)));
};

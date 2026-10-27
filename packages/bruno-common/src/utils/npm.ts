export const NPM_NAME_REGEX = /^(?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/i;

// Package names can come from untrusted collection scripts, so anything placed into an npm
// command (spawned or shown for copy-paste) must pass this check first.
export const isValidNpmPackageName = (name: unknown): name is string => {
  return typeof name === 'string' && NPM_NAME_REGEX.test(name);
};

// Name/filename helpers are the single shared implementation in @usebruno/common.
// Re-exported here so existing `utils/common/regex` import paths keep working.
export { sanitizeName, validateName, validateNameError } from '@usebruno/common/utils';

export const variableNameRegex = /^[\w-.]*$/;

// Local scripts are host-executed commands registered in bruno.json and
// referenced as `{{$script:name}}` in environment variables.
export const localScriptNameRegex = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
export const LOCAL_SCRIPT_VARIABLE_PREFIX = '$script:';

// Returns the script name for a well-formed `{{...}}` token body, otherwise null.
export const getLocalScriptName = (word) => {
  if (typeof word !== 'string' || !word.startsWith(LOCAL_SCRIPT_VARIABLE_PREFIX)) {
    return null;
  }
  const name = word.slice(LOCAL_SCRIPT_VARIABLE_PREFIX.length);
  return localScriptNameRegex.test(name) ? name : null;
};

// HTTP header name should not contain spaces, newlines, or control characters
export const headerNameRegex = /^[^\s\r\n]*$/;

// HTTP header value should not contain newlines
export const headerValueRegex = /^[^\r\n]*$/;

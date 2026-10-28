// Name/filename helpers are the single shared implementation in @usebruno/common.
// Re-exported here so existing `utils/common/regex` import paths keep working.
export { sanitizeName, validateName, validateNameError } from '@usebruno/common/utils';
import { LOCAL_SCRIPT_NAME_PATTERN, LOCAL_SCRIPT_VAR_PREFIX } from '@usebruno/common/utils';

export const variableNameRegex = /^[\w-.]*$/;

// Local scripts are host-executed commands registered in the global registry
// and referenced as `{{$script:name}}` in variables and request fields. The
// name/prefix contract is shared with the Node side via @usebruno/common.
export const localScriptNameRegex = LOCAL_SCRIPT_NAME_PATTERN;
export const LOCAL_SCRIPT_VARIABLE_PREFIX = LOCAL_SCRIPT_VAR_PREFIX;

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

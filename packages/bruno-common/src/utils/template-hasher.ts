const VARIABLE_REGEX = /\{\{([^}]+)\}\}/g;

/**
 * Was implemented specifically for request.url where the url might have variables
 * that might need to be sanitised before being passed to a URL validator that doesn't
 * allow special characters that bruno uses as variables (`{{var_name}}`)
 *
 * The function replaces the input string with a unique hash that can be restored
 * later by the helper returned by this function
 */
export function patternHasher(input: string, pattern: string | RegExp = VARIABLE_REGEX) {
  const usableRegex = new RegExp(pattern, 'g');
  function hash(toHash: string) {
    let hash = 5381;
    let c;
    for (let i = 0; i < toHash.length; i++) {
      c = toHash.charCodeAt(i);
      hash = ((hash << 5) + hash + c) | 0;
    }
    return '' + hash;
  }

  const prefix = `bruno-var-hash-`;
  const hashToOriginal: Record<string, string> = {};
  let result = input;
  let hashed = false;
  if (usableRegex.test(input)) {
    hashed = true;
    result = input.replace(usableRegex, function (matchedVar) {
      const hashedValue = `${prefix}${hash(matchedVar)}`;
      hashToOriginal[hashedValue] = matchedVar;
      return hashedValue;
    });
  }
  return {
    hashed: result,
    restore(current: string) {
      if (!hashed) {
        return current;
      }
      let clone = current;
      for (const hash in hashToOriginal) {
        const value = hashToOriginal[hash];
        clone = clone.replace(hash, value);
      }
      return clone;
    }
  };
}

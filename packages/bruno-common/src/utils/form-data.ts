/**
 * Builds a URL-encoded payload from various data formats
 *
 * This function handles multiple input formats:
 * - Array of objects with 'name' and 'value' properties (preserves order)
 *
 * @param data The request body data
 * @returns URL-encoded string suitable for application/x-www-form-urlencoded content type
 *
 * @example
 * // Array format (preserves order)
 * buildFormUrlEncodedPayload([{name: 'a', value: '1'}, {name: 'b', value: '2'}])
 * // Returns: 'a=1&b=2'
 */
export const buildFormUrlEncodedPayload = (params: Array<{ name: string; value: string | number | boolean | undefined }>): string => {
  // Ensure params is iterable (array)
  if (!Array.isArray(params)) {
    return '';
  }

  const resultParams = new URLSearchParams();

  for (const param of params) {
    // Invalid items are ignored
    if (typeof param !== 'object' || param === null) continue;
    if (!('name' in param)) continue;

    // Append parameter with value (default to empty string if undefined/null)
    resultParams.append(param.name, String(param.value ?? ''));
  }

  return resultParams.toString();
};

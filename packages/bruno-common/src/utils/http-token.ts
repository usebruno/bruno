/**
 * Checks if a string is a valid HTTP token (RFC 7230)
 * @param token - The string to validate
 * @returns true if valid, false otherwise
 */
export function isValidHttpToken(token: string): boolean {
  const tokenRegex = /^[!#$%&'*+.^_`|~0-9a-zA-Z-]+$/;
  return tokenRegex.test(token);
}

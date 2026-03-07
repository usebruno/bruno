export interface DotenvVariable {
  name: string;
  value?: string;
}

/**
 * Serializes an array of environment variables to .env file format.
 *
 * This is the inverse of dotenvToJson - it converts a variables array
 * back to .env file content that can be parsed by the dotenv package.
 *
 * Values containing special characters are wrapped in double quotes:
 * - newlines (\n): would break the line-based format
 * - double quotes ("): need escaping
 * - single quotes ('): need escaping
 * - backslashes (\): need escaping
 * - hash (#): would be interpreted as comment start by dotenv parser
 */
export const jsonToDotenv = (variables: DotenvVariable[]): string => {
  if (!Array.isArray(variables)) {
    return '';
  }

  return variables
    .filter((v) => v.name && v.name.trim() !== '')
    .map((v) => {
      const value = v.value || '';
      // If value contains special characters, wrap in quotes
      if (value.includes('\n') || value.includes('"') || value.includes('\'') || value.includes('\\') || value.includes('#')) {
        // Escape backslashes first, then double quotes, then newlines
        const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        return `${v.name}="${escapedValue}"`;
      }
      return `${v.name}=${value}`;
    })
    .join('\n');
};

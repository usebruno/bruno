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
 * Quoting strategy based on dotenv parser behavior:
 * - Unquoted: preserves \, ", ' literally. Only # is problematic (starts comment).
 * - Single-quoted: everything is literal. Cannot contain single quotes.
 * - Double-quoted: only \n and \r are expanded. Everything else is literal.
 *
 * Therefore:
 * - Values with actual newlines/carriage returns → double-quote + escape \n/\r
 * - Values with # but no ' → single-quote (literal)
 * - Values with # and ' → backtick-quote or double-quote fallback
 * - Values with leading/trailing whitespace → quote to prevent trimming
 * - Everything else → unquoted (preserves \, ", ' as-is)
 */
export const jsonToDotenv = (variables: DotenvVariable[]): string => {
  if (!Array.isArray(variables)) {
    return '';
  }

  return variables
    .filter((v) => v.name && v.name.trim() !== '')
    .map((v) => {
      const value = v.value || '';

      // Values with actual newlines or carriage returns must use double quotes
      // since dotenv expands \n and \r only in double-quoted values
      if (value.includes('\n') || value.includes('\r')) {
        const escapedValue = value.replace(/\r/g, '\\r').replace(/\n/g, '\\n');
        return `${v.name}="${escapedValue}"`;
      }

      // Hash (#) requires quoting — dotenv treats it as comment start in unquoted values
      if (value.includes('#')) {
        // Prefer single quotes (fully literal)
        if (!value.includes('\'')) {
          return `${v.name}='${value}'`;
        }
        // Fall back to backtick quotes (also fully literal, supports both ' and ")
        if (!value.includes('`')) {
          return `${v.name}=\`${value}\``;
        }
        // Extremely rare: value has #, ', and ` — escape " for double quotes
        const escapedValue = value.replace(/"/g, '\\"');
        return `${v.name}="${escapedValue}"`;
      }

      // Leading/trailing whitespace requires quoting — dotenv trims unquoted values
      if (value !== value.trim()) {
        if (!value.includes('\'')) {
          return `${v.name}='${value}'`;
        }
        if (!value.includes('`')) {
          return `${v.name}=\`${value}\``;
        }
        return `${v.name}="${value}"`;
      }

      // Everything else can be unquoted — dotenv preserves \, ", ' in unquoted values
      return `${v.name}=${value}`;
    })
    .join('\n');
};

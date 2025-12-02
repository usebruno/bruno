/**
 * Inner regex pattern for prompt variable names (without braces or `?` prefix)
 *
 * Pattern: /[^{}\s](?:[^{}]*[^{}\s])?/
 *
 * Breakdown:
 * | Part           | Meaning                                                    |
 * | -------------- | ---------------------------------------------------------- |
 * | `[^\s{}]`      | First character: not whitespace, `{`, or `}`               |
 * | `(?:...)?`     | Optional non-capturing group (allows single-char names)    |
 * | `[^{}]*`       | Middle characters: any except `{` or `}` (spaces allowed)  |
 * | `[^\s{}]`      | Last character: not whitespace, `{`, or `}`                |
 *
 * This inner pattern is reused in:
 * - PROMPT_VARIABLE_TEXT_PATTERN: Matches "?Name" format (with anchors)
 * - PROMPT_VARIABLE_PATTERN: Matches "{{?Name}}" format (in templates)
 *
 * Valid examples: "Name", "Prompt Var", "x"
 * Invalid examples: " Name", "Name ", "{Name}", "Na{me}"
 */
const PROMPT_VARIABLE_PATTERN = /[^{}\s](?:[^{}]*[^{}\s])?/;

/**
 * Valid examples: "?Name", "?Prompt Var", "?x"
 * Invalid examples: "? Name", "?Name ", "?{{Name}}", "?{Name}"
 */
export const PROMPT_VARIABLE_TEXT_PATTERN = new RegExp(`^\\?(${PROMPT_VARIABLE_PATTERN.source})$`);

/**
 * Valid matches: "{{?Name}}", "{{?Prompt Var}}", "{{?x}}"
 * Invalid: "{{? Name}}", "{{?Name }}", "{{?{Name}}}"
 */
export const PROMPT_VARIABLE_TEMPLATE_PATTERN = new RegExp(`{{\\?(${PROMPT_VARIABLE_PATTERN.source})}}`, 'g');

/**
 * Extract prompt variables matching {{?<Prompt Text>}} from a string.
 * @param {string} str - The input string.
 * @returns {string[]} - An array of extracted prompt variables.
 */
export const extractPromptVariablesFromString = (str: string): string[] => {
  const prompts = new Set<string>();
  let match;
  while ((match = PROMPT_VARIABLE_TEMPLATE_PATTERN.exec(str)) !== null) {
    prompts.add(match[1]);
  }
  return Array.from(prompts);
};

/**
 * Extract prompt variables from an object.
 * @param {*} obj - The input object.
 * @returns {string[]} - An array of extracted prompt variables.
 */
export function extractPromptVariables(obj: any): string[] {
  const prompts = new Set<string>();
  try {
    if (typeof obj === 'string') {
      // Extract prompt variables from strings
      const extracted = extractPromptVariablesFromString(obj);
      extracted.forEach((prompt) => prompts.add(prompt));
    } else if (Array.isArray(obj)) {
      // Recursively extract from array elements
      for (const item of obj) {
        const extracted = extractPromptVariables(item);
        extracted.forEach((prompt) => prompts.add(prompt));
      }
    } else if (typeof obj === 'object' && obj !== null) {
      // Recursively extract from object properties
      for (const key in obj) {
        const extracted = extractPromptVariables(obj[key]);
        extracted.forEach((prompt) => prompts.add(prompt));
      }
    }
  } catch (error) {
    console.error('Error extracting prompt variables:', error);
  }
  return Array.from(prompts);
}

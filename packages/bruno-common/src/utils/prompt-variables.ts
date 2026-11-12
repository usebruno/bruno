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
 * Parse a prompt variable's raw inner text into a display label and, when the enum syntax is used,
 * the list of fixed values to offer as a dropdown.
 *
 * - `Label|a,b,c`  → single-select dropdown (`multi: false`)
 * - `Label||a,b,c` → multi-select dropdown (`multi: true`); the chosen values are joined with `,`
 * - `Label`        → free-text prompt (`options: null`)
 *
 * An option prefixed with `*` is preselected by default (`*b` in `a,*b,c` → `b` is the default
 * selection). For a single-select only the first starred option is used; for multi-select every
 * starred option is preselected. The `*` is a display-only marker and is stripped from both the
 * option and its default value.
 *
 * The raw string is the exact text captured between `{{?` and `}}`, and it doubles as the
 * interpolation key (`?<raw>`), so this parsing only affects how the prompt is *displayed* and what
 * it defaults to — it never changes the substitution key.
 *
 * @param {string} raw - The prompt variable inner text, e.g. "Country|US,*UK,DE" or "Token".
 * @returns {{ label: string, options: string[] | null, multi: boolean, defaults: string[] }} -
 *   `options` is null when no fixed values are given (plain prompt) or when every value is empty
 *   after trimming; `defaults` holds the values marked with a leading `*` (empty when none are).
 */
export const parsePromptVariable = (
  raw: string
): { label: string; options: string[] | null; multi: boolean; defaults: string[] } => {
  const pipeIndex = raw.indexOf('|');
  if (pipeIndex === -1) {
    return { label: raw.trim(), options: null, multi: false, defaults: [] };
  }

  const multi = raw[pipeIndex + 1] === '|';
  const label = raw.slice(0, pipeIndex).trim();
  const defaults: string[] = [];
  const options = raw
    .slice(pipeIndex + (multi ? 2 : 1))
    .split(',')
    .map((option) => option.trim())
    .filter((option) => option.length > 0)
    .map((option) => {
      if (option.startsWith('*')) {
        const value = option.slice(1).trim();
        if (value.length > 0 && (multi || defaults.length === 0)) {
          defaults.push(value);
        }
        return value;
      }
      return option;
    })
    .filter((option) => option.length > 0);

  return { label, options: options.length > 0 ? options : null, multi, defaults };
};

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

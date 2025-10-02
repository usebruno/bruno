/**
 * Extract prompt variables matching {{?<Prompt Text>}} from a string.
 * @param {string} str - The input string.
 * @returns {string[]} - An array of extracted prompt variables.
 */
export const extractPromptVariablesFromString = (str: string): string[] => {
  const regex = /{{\?([^}]+)}}/g;
  const prompts = new Set<string>();
  let match;
  while ((match = regex.exec(str)) !== null) {
    prompts.add(match[1].trim());
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

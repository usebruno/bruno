// Utility to extract prompt variables of the form {{?:Prompt Text}}
export function extractPromptVariables(str) {
  const regex = /{{\?:([^}]+)}}/g;
  const prompts = new Set();
  let match;
  while ((match = regex.exec(str)) !== null) {
    prompts.add(match[1].trim());
  }
  return Array.from(prompts);
}

// Utility to replace prompt variables with user input
export function replacePromptVariables(str, values) {
  return str.replace(/{{\?:([^}]+)}}/g, (match, p1) => {
    const key = p1.trim();
    return values[key] !== undefined ? values[key] : match;
  });
}

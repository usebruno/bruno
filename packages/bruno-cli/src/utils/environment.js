/**
 * Parse a Bruno JSON environment object and normalize variables
 * Accepts only single environment object: { name?, uid?, variables: [...] }
 */
const parseEnvironmentJson = (parsed = {}) => {
  if (!parsed || !Array.isArray(parsed.variables)) {
    throw new Error('Invalid environment JSON: expected a single environment object with a "variables" array');
  }

  const normalized = {
    name: parsed.name,
    variables: (parsed.variables || []).filter(Boolean).map((variable) => ({
      name: variable.name,
      value: variable.value,
      type: variable.type || 'text',
      enabled: variable.enabled !== false,
      secret: variable.secret || false
    }))
  };

  return normalized;
};

module.exports = {
  parseEnvironmentJson
};

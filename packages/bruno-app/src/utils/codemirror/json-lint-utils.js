/**
 * Improves JSON lint error messages to be more human-readable.
 * Handles common mistakes that non-technical users make.
 *
 * The built-in jsonlint/JSON.parse error messages are often cryptic
 * (e.g. "Unexpected number in JSON at position 11"). This function
 * detects common JSON mistakes and provides clear, actionable messages
 * that help users understand and fix the error.
 */

/**
 * @param {string} message - Original error message from jsonlint
 * @param {string} text - Full text of the JSON body
 * @param {number} line - 1-indexed line number of the error
 * @param {number} column - Column number of the error
 * @returns {string} Improved error message
 */
const improveJsonErrorMessage = (message, text, line, column) => {
  if (!text || !message) {
    return message;
  }

  const lines = text.split('\n');
  const errorLine = lines[line - 1] || '';

  // 1. Leading zeros in numbers (e.g., 0000, 00123)
  // JSON spec does not allow leading zeros in numbers
  if (
    message.includes('Unexpected number') ||
    message.includes('Invalid number') ||
    message.includes('Expected')
  ) {
    const leadingZeroMatch = errorLine.match(/\b0\d+\b/);
    if (leadingZeroMatch) {
      const wrongValue = leadingZeroMatch[0];
      const fixedValue = parseInt(wrongValue, 10);
      return `Invalid number "${wrongValue}": JSON does not allow leading zeros in numbers. Use ${fixedValue} instead.`;
    }
  }

  // 2. Trailing commas (e.g., {"a": 1,})
  if (
    message.includes('Unexpected token') ||
    message.includes('Expected') ||
    message.includes('Unexpected end')
  ) {
    const trimmed = errorLine.trim();
    if (trimmed.endsWith(',')) {
      return 'Trailing comma: The last item in a JSON object or array must not have a comma after it. Remove the extra comma.';
    }
  }

  // 3. Unquoted property keys (e.g., {name: "test"} instead of {"name": "test"})
  if (
    message.includes('Unexpected string') ||
    message.includes('Expected string') ||
    message.includes('Expected')
  ) {
    const keyMatch = errorLine.match(/^\s*(\w+)\s*:/);
    if (keyMatch && !errorLine.includes(`"${keyMatch[1]}"`)) {
      const key = keyMatch[1];
      return `Unquoted key "${key}": JSON requires property names to be in double quotes. Use "${key}": instead.`;
    }
  }

  // 4. Single quotes (JSON only allows double quotes)
  if (message.includes('Unexpected token') || message.includes('Bad string')) {
    if (errorLine.includes("'")) {
      return 'Wrong quote style: JSON uses double quotes ("), not single quotes (\'). Replace the single quotes with double quotes.';
    }
  }

  // 5. Comments in JSON (JSON does not support comments)
  if (message.includes('Unexpected token')) {
    if (errorLine.includes('//') || errorLine.includes('/*')) {
      return 'Comments not allowed: JSON does not support comments. Remove any // or /* */ comments from the body.';
    }
  }

  // Fallback: return the original message if we couldn't improve it
  // Use jsonlint's message which is usually better than JSON.parse's
  return message;
};

module.exports = { improveJsonErrorMessage };

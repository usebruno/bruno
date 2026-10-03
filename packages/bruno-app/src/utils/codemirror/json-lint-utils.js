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
  // Must come first and use pattern matching on the error line, since
  // jsonlint may produce various messages (Unexpected number, Expected, etc.)
  const leadingZeroMatch = errorLine.match(/\b0\d+\b/);
  if (leadingZeroMatch) {
    const wrongValue = leadingZeroMatch[0];
    const fixedValue = parseInt(wrongValue, 10);
    return [
      `Invalid number "${wrongValue}": JSON does not allow leading zeros. Use ${fixedValue} instead.`,
      `Ungültige Zahl "${wrongValue}": JSON erlaubt keine führenden Nullen. Verwende ${fixedValue} statt ${wrongValue}.`
    ].join('\n');
  }

  // 2. Trailing commas (e.g., {"a": 1,})
  if (errorLine.trim().endsWith(',')) {
    return [
      'Trailing comma: The last item in a JSON object or array must not have a comma after it.',
      'Überflüssiges Komma: Das letzte Element in einem JSON-Objekt oder Array darf kein Komma am Ende haben.'
    ].join('\n');
  }

  // 3. Unquoted property keys (e.g., {name: "test"} instead of {"name": "test"})
  const keyMatch = errorLine.match(/^\s*(\w+)\s*:/);
  if (keyMatch && !errorLine.includes(`"${keyMatch[1]}"`) && !errorLine.includes("'")) {
    const key = keyMatch[1];
    return [
      `Unquoted key "${key}": JSON requires property names in double quotes. Use "${key}": instead.`,
      `Fehlende Anführungszeichen bei "${key}": JSON verlangt doppelte Anführungszeichen für Eigenschaftsnamen. Schreibe "${key}": statt ${key}:.`
    ].join('\n');
  }

  // 4. Single quotes (JSON only allows double quotes)
  if (errorLine.includes("'")) {
    return [
      'Wrong quote style: JSON uses double quotes ("), not single quotes (\').',
      'Falsche Anführungszeichen: JSON verwendet doppelte ("), nicht einfache Anführungszeichen (\').'
    ].join('\n');
  }

  // 5. Comments in JSON (JSON does not support comments)
  if (
    errorLine.match(/^\s*(\/\/|\/\*)/) ||
    (!errorLine.includes('"') && (errorLine.includes('//') || errorLine.includes('/*')))
  ) {
    return [
      'Comments not allowed: JSON does not support // or /* */ comments.',
      'Kommentare nicht erlaubt: JSON unterstützt keine // oder /* */ Kommentare.'
    ].join('\n');
  }

  // Fallback: return the original message
  return message;
};

module.exports = { improveJsonErrorMessage };

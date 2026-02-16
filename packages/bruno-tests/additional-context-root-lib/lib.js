/**
 * Simple local module to test local module resolution from additionalContextRoot
 */

function formatName(firstName, lastName) {
  return `${firstName} ${lastName}`;
}

function generateGreeting(name) {
  return `Hello, ${name}!`;
}

module.exports = {
  formatName,
  generateGreeting
};

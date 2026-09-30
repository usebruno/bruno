/**
 * Utility module in additionalContextRoot to test:
 * 1. Loading modules from additionalContextRoot
 * 2. npm module resolution (@faker-js/faker) from collection's node_modules
 * 3. Local module resolution (./lib.js) relative to additionalContextRoot
 */

const { faker } = require('@faker-js/faker');
const { formatName, generateGreeting } = require('./lib');

/**
 * Generate a random user with greeting
 * Tests both npm module and local module resolution
 */
function generateUser() {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const fullName = formatName(firstName, lastName);
  const greeting = generateGreeting(fullName);

  return {
    firstName,
    lastName,
    fullName,
    greeting,
    email: faker.internet.email({ firstName, lastName })
  };
}

/**
 * Verify that all dependencies resolved correctly
 */
function verifyDependencies() {
  return {
    fakerLoaded: typeof faker === 'object' && typeof faker.person === 'object',
    localModuleLoaded: typeof formatName === 'function' && typeof generateGreeting === 'function'
  };
}

module.exports = {
  generateUser,
  verifyDependencies,
  formatName,
  generateGreeting
};

import postmanToBruno from './postman/postman-to-bruno.js';
import postmanToBrunoEnvironment from './postman/postman-env-to-bruno-env.js';
import brunoToPostman from './postman/bruno-to-postman.js';
import openApiToBruno from './openapi/openapi-to-bruno.js';
import insomniaToBruno from './insomnia/insomnia-to-bruno.js';

// Create the default export object
const converters = {
  postmanToBruno,
  postmanToBrunoEnvironment,
  brunoToPostman,
  openApiToBruno,
  insomniaToBruno
};

// Export as default
export default converters;

// Export named exports
export {
  postmanToBruno,
  postmanToBrunoEnvironment,
  brunoToPostman,
  openApiToBruno,
  insomniaToBruno
};
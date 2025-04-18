/**
 * Constants used in the AST operations
 * These constants help avoid string literals in the code for better maintainability
 */

// Source types for parsing
const SourceType = {
  Module: 'module',
  Script: 'script'
};

Object.freeze(SourceType);

export default SourceType;
import {
  parseRequest as bruParseRequest,
  stringifyRequest as bruStringifyRequest,
  parseFolder as bruParseFolder,
  stringifyFolder as bruStringifyFolder,
  parseCollection as bruParseCollection,
  stringifyCollection as bruStringifyCollection,
  parseEnvironment as bruParseEnvironment,
  stringifyEnvironment as bruStringifyEnvironment
} from './bru';

const parseRequest = (bru, options = {}) => {
  if (options.format === 'bru') {
    return bruParseRequest(bru);
  }
};

const stringifyRequest = (json, options = {}) => {
  if (options.format === 'bru') {
    return bruStringifyRequest(json);
  }
};

const parseFolder = (bru, options = {}) => {
  if (options.format === 'bru') {
    return bruParseFolder(bru);
  }
};

const stringifyFolder = (json, options = {}) => {
  if (options.format === 'bru') {
    return bruStringifyFolder(json);
  }
};

const parseCollection = (bru, options = {}) => {
  if (options.format === 'bru') {
    return bruParseCollection(bru);
  }
};

const stringifyCollection = (json, options = {}) => {
  if (options.format === 'bru') {
    return bruStringifyCollection(json);
  }
};

const parseEnvironment = (bru, options = {}) => {
  if (options.format === 'bru') {
    return bruParseEnvironment(bru);
  }
};

const stringifyEnvironment = (json, options = {}) => {
  if (options.format === 'bru') {
    return bruStringifyEnvironment(json);
  }
};

module.exports = {
  parseRequest,
  stringifyRequest,
  parseFolder,
  stringifyFolder,
  parseCollection,
  stringifyCollection,
  parseEnvironment,
  stringifyEnvironment
};
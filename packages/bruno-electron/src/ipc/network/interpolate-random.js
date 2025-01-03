// Import faker.js
const { faker } = require('@faker-js/faker');
const { each, forOwn } = require('lodash');
const FormData = require('form-data');

const getContentType = (headers = {}) => {
    let contentType = '';
    forOwn(headers, (value, key) => {
      if (key && key.toLowerCase() === 'content-type') {
        contentType = value;
      }
    });
  
    return contentType;
  };
  
  const interpolateRandom = (request) => {

    const _interpolate = (str) => {
      if (!str || !str.length || typeof str !== 'string') {
        return str;
      }

      let resultStr = str;
      let matchFound = true;
    
      while (matchFound) {
        const patternRegex = /\{\{\$([^}]+)\}\}/g;
        matchFound = false;
        resultStr = resultStr.replace(patternRegex, (_, placeholder) => {
          const replacement = getRandomValue(placeholder);
          matchFound = true;
          return replacement;
        });
      }
    
      return resultStr;
    };
  
    request.url = _interpolate(request.url);
  
    const contentType = getContentType(request.headers);
  
    if (contentType.includes('json')) {
      if (typeof request.data === 'string') {
        if (request.data.length) {
          request.data = _interpolate(request.data);
        }
      } else if (typeof request.data === 'object') {
        try {
          let parsed = JSON.stringify(request.data);
          parsed = _interpolate(parsed);
          request.data = JSON.parse(parsed);
        } catch (err) {}
      }
    } else if (contentType === 'application/x-www-form-urlencoded') {
      if (typeof request.data === 'object') {
        try {
          forOwn(request?.data, (value, key) => {
            request.data[key] = _interpolate(value);
          });
        } catch (err) {}
      }
    } else if (contentType === 'multipart/form-data') {
      if (typeof request.data === 'object' && !(request.data instanceof FormData)) {
        try {
          forOwn(request?.data, (value, key) => {
            request.data[key] = _interpolate(value);
          });        
        } catch (err) {}
      }
    } else {
      request.data = _interpolate(request.data);
    }
  
    each(request.pathParams, (param) => {
      param.value = _interpolate(param.value);
    });
  
    if (request?.pathParams?.length) {
      let url = request.url;
  
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `http://${url}`;
      }
  
      try {
        url = new URL(url);
      } catch (e) {
        throw { message: 'Invalid URL format', originalError: e.message };
      }
  
      const urlPathnameInterpolatedWithPathParams = url.pathname
        .split('/')
        .filter((path) => path !== '')
        .map((path) => {
          if (path[0] !== ':') {
            return '/' + path;
          } else {
            const name = path.slice(1);
            const existingPathParam = request.pathParams.find((param) => param.type === 'path' && param.name === name);
            return existingPathParam ? '/' + existingPathParam.value : '';
          }
        })
        .join('');
  
      const trailingSlash = url.pathname.endsWith('/') ? '/' : '';
      request.url = url.origin + urlPathnameInterpolatedWithPathParams + trailingSlash + url.search;
    }
  
    return request;
  };

// Function to get random values based on the variable name
function getRandomValue(variableName) {
  switch(variableName) {
    case "guid":
      return faker.datatype.uuid(); // Generates a UUID
    case "timestamp":
      return Math.floor(Date.now() / 1000); // Current UNIX timestamp
    case "isoTimestamp":
      return new Date().toISOString(); // Current ISO timestamp
    case "randomUUID":
      return faker.datatype.uuid(); // Random 36-character UUID
    case "randomAlphaNumeric":
      return faker.random.alphaNumeric(1); // Random alphanumeric character
    case "$randomBoolean":
      return faker.datatype.boolean(); // Random boolean
    case "randomInt":
      return faker.datatype.number({ min: 0, max: 1000 }); // Random integer between 0 and 1000
    case "randomColor":
      return faker.color.human(); // Random color name (human-readable)
    case "$randomHexColor":
      return faker.internet.color(); // Random hex color code
    case "$randomAbbreviation":
      return faker.random.arrayElement(['SQL', 'PCI', 'JSON', 'HTTP', 'XML']); // Random abbreviation
    case "randomIP":
      return faker.internet.ip(); // Random IPv4 address
    case "randomIPV6":
      return faker.internet.ipv6(); // Random IPv6 address
    case "randomMACAddress":
      return faker.internet.mac(); // Random MAC address
    case "randomPassword":
      return faker.internet.password(); // Random password (default 8 characters)
    case "randomLocale":
      return faker.random.locale(); // Random two-letter language code (ISO 639-1)
    case "randomUserAgent":
      return faker.internet.userAgent(); // Random user agent string
    case "$randomProtocol":
      return faker.internet.protocol(); // Random internet protocol (http, https)
    case "randomSemver":
      return faker.system.semver(); // Random semantic version
    case "randomFirstName":
      return faker.name.firstName(); // Random first name
    case "randomLastName":
      return faker.name.lastName(); // Random last name
    case "randomFullName":
      return faker.name.fullName(); // Random full name
    case "randomNamePrefix":
      return faker.name.prefix(); // Random name prefix (e.g., Mr., Ms.)
    case "randomNameSuffix":
      return faker.name.suffix(); // Random name suffix (e.g., MD, Jr.)
    case "randomPhoneNumber":
      return faker.phone.number(); // Random phone number
    case "randomCity":
      return faker.address.city(); // Random city name
    case "randomStreetName":
      return faker.address.streetName(); // Random street name
    case "randomStreetAddress":
      return faker.address.streetAddress(); // Random street address
    case "randomCountry":
      return faker.address.country(); // Random country name
    case "randomCountryCode":
      return faker.address.countryCode(); // Random two-letter country code
    case "randomLatitude":
      return faker.address.latitude(); // Random latitude coordinate
    case "randomLongitude":
      return faker.address.longitude(); // Random longitude coordinate
    case "randomAvatarImage":
      return faker.image.avatar(); // Random avatar image URL
    case "randomImageUrl":
      return faker.image.imageUrl(); // Random image URL
    case "randomPrice":
      return faker.commerce.price(); // Random price between 0.00 and 1000.00
    case "randomProduct":
      return faker.commerce.productName(); // Random product name
    case "randomCompanyName":
      return faker.company.name(); // Random company name
    case "randomEmail":
      return faker.internet.email(); // Random email address
    default:
      return null; // If no match found, return null
  }
}

module.exports = interpolateRandom;

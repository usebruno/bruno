const { faker } = require('@faker-js/faker');

/**
 * Intelligently generates values based on field name patterns
 * @param {string} fieldName - Field name to generate appropriate value for
 * @returns {*} Generated value
 */
const generateIntelligentValue = (fieldName = '') => {
  const name = fieldName.toLowerCase();
  
  // Check common field name patterns
  if (name.includes('id')) {
    return faker.datatype.uuid();
  } else if (name.includes('name')) {
    return faker.name.fullName();
  } else if (name.includes('email')) {
    return faker.internet.email();
  } else if (name.includes('phone')) {
    return faker.phone.number();
  } else if (name.includes('address')) {
    return faker.address.streetAddress();
  } else if (name.includes('city')) {
    return faker.address.city();
  } else if (name.includes('country')) {
    return faker.address.country();
  } else if (name.includes('zip') || name.includes('postal')) {
    return faker.address.zipCode();
  } else if (name.includes('date')) {
    return faker.date.recent().toISOString();
  } else if (name.includes('time')) {
    return faker.date.recent().toISOString();
  } else if (name.includes('description')) {
    return faker.lorem.paragraph();
  } else if (name.includes('title')) {
    return faker.lorem.sentence();
  } else if (name.includes('url') || name.includes('link')) {
    return faker.internet.url();
  } else if (name.includes('image') || name.includes('photo')) {
    return faker.image.imageUrl();
  } else if (name.includes('color')) {
    return faker.color.rgb();
  } else if (name.includes('price') || name.includes('cost')) {
    return faker.commerce.price();
  } else if (name.includes('product')) {
    return faker.commerce.productName();
  } else if (name.includes('bool') || name.includes('flag') || name.includes('enabled')) {
    return faker.datatype.boolean();
  } else if (name.includes('count') || name.includes('number') || name.includes('age')) {
    return faker.datatype.number({ min: 0, max: 100 });
  } else if (typeof name === 'string') {
    return faker.lorem.word();
  } else {
    return '';
  }
};


/**
 * Generates a sample message based on method parameter fields
 * @param {Object} fields - Method parameter fields
 * @param {Object} options - Generation options
 * @returns {Object} Generated message
 */
const generateSampleMessageFromFields = (fields, options = {}) => {
  const result = {};
  
  if (!fields || !Array.isArray(fields)) {
    return {};
  }

  console.log("fields from generateSampleMessageFromFields", fields);
  
  fields.forEach(field => {
    // Generate a value based on field name and type
    if (field.type === 'TYPE_MESSAGE') {
      // Handle nested message
      if (field.messageType && field.messageType.field) {
        if (field.repeated) {
          // Generate array of nested messages
          const count = options.arraySize || faker.datatype.number({ min: 1, max: 3 });
          result[field.name] = Array.from({ length: count }, () => 
            generateSampleMessageFromFields(field.messageType.field, options)
          );
        } else {
          // Generate single nested message
          result[field.name] = generateSampleMessageFromFields(field.messageType.field, options);
        }
      } else {
        // No field info for nested message, generate a simple object
        result[field.name] = field.repeated ? [{}] : {};
      }
    } else if (field.type === 'TYPE_ENUM') {
      // Handle enum fields by picking a random valid value if available
      if (field.enumType && field.enumType.value && field.enumType.value.length) {
        const enumValues = field.enumType.value;
        const randomIndex = faker.datatype.number({ min: 0, max: enumValues.length - 1 });
        result[field.name] = enumValues[randomIndex].number;
      } else {
        result[field.name] = 0; // Default enum value
      }
    } else {
      // Generate value based on primitive type and name
      let value;
      
      switch (field.type) {
        case 'TYPE_DOUBLE':
        case 'TYPE_FLOAT':
          value = faker.datatype.float({ min: 0, max: 1000, precision: 0.01 });
          break;
        case 'TYPE_INT32':
        case 'TYPE_INT64':
        case 'TYPE_SINT32':
        case 'TYPE_SINT64':
        case 'TYPE_UINT32':
        case 'TYPE_UINT64':
        case 'TYPE_FIXED32':
        case 'TYPE_FIXED64':
          value = faker.datatype.number({ min: 0, max: 1000 });
          break;
        case 'TYPE_BOOL':
          value = faker.datatype.boolean();
          break;
        case 'TYPE_STRING':
          value = generateIntelligentValue(field.name);
          break;
        case 'TYPE_BYTES':
          value = faker.datatype.string();
          break;
        default:
          value = generateIntelligentValue(field.name);
      }
      
      if (field.repeated) {
        // Generate array of values
        const count = options.arraySize || faker.datatype.number({ min: 1, max: 3 });
        result[field.name] = Array.from({ length: count }, () => value);
      } else {
        result[field.name] = value;
      }
    }
  });
  
  return result;
};

/**
 * Extracts field definitions from a method's request type
 * @param {Object} method - The gRPC method
 * @returns {Array|null} Array of field definitions or null
 */
const getMethodRequestFields = (method) => {
  console.log("method from getMethodRequestFields", method);
  try {
    // Navigate through various potential property paths to find fields
    if (method.requestType?.type?.field) {
      return method.requestType.type.field;
    }
    
    if (method.requestType?.field) {
      return method.requestType.field;
    }
    
    if (method.requestType?.type) {
      return method.requestType.type;
    }
   
  } catch (error) {
    console.error('Error extracting method request fields:', error);
    return null;
  }
};

/**
 * Generates a sample gRPC message based on a method definition
 * @param {Object} method - gRPC method definition
 * @param {Object} options - Generation options
 * @returns {Object} Generated message
 */
const generateGrpcSampleMessage = (method, options = {}) => {
  try {
    if (!method) {
      return {};
    }
    
    const fields = getMethodRequestFields(method);
    
    if (fields) {
      return generateSampleMessageFromFields(fields, options);
    }
    
    // If method exists but no field information could be extracted,
    // generate a generic message that matches common patterns
    return {};
  } catch (error) {
    console.error('Error generating gRPC sample message:', error);
  }
};

module.exports = {
  generateGrpcSampleMessage,
  generateIntelligentValue,
}; 
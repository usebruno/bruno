import { faker } from '@faker-js/faker';

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
  
  fields.forEach(field => {
    // Generate a value based on field name and type
    if (field.type === 'TYPE_MESSAGE') {
      // Handle nested message
      if (field.messageType && field.messageType.field) {
        if (field.label === 'LABEL_REPEATED') {
          // Generate array of nested messages
          const count = options.arraySize || faker.number.int({ min: 1, max: 3 });
          result[field.name] = Array.from({ length: count }, () => 
            generateSampleMessageFromFields(field.messageType.field, options)
          );
        } else {
          // Generate single nested message
          result[field.name] = generateSampleMessageFromFields(field.messageType.field, options);
        }
      } else {
        // No field info for nested message, generate a simple object
        result[field.name] = field.label === 'LABEL_REPEATED' ? [{}] : {};
      }
    } else if (field.type === 'TYPE_ENUM') {
      result[field.name] = field.label === 'LABEL_REPEATED' ? [0] : 0;
    } else {
      // Generate value based on primitive type and name
      let value;
      
      switch (field.type) {
        case 'TYPE_DOUBLE':
        case 'TYPE_FLOAT':
          value = faker.number.float({ min: 0, max: 1000, precision: 0.01 });
          break;
        case 'TYPE_INT32':
        case 'TYPE_INT64':
        case 'TYPE_SINT32':
        case 'TYPE_SINT64':
        case 'TYPE_UINT32':
        case 'TYPE_UINT64':
        case 'TYPE_FIXED32':
        case 'TYPE_FIXED64':
          value = faker.number.int({ min: 0, max: 1000 });
          break;
        case 'TYPE_BOOL':
          value = faker.datatype.boolean();
          break;
        case 'TYPE_STRING':
          value = faker.lorem.word()
          break;
        case 'TYPE_BYTES':
          value = Buffer.from(faker.string.alpha({ length: { min: 5, max: 10 } })).toString('base64');
          break;
        default:
          value = faker.lorem.word();
      }

      if (field.label === 'LABEL_REPEATED') {
        // Generate array of values
        const count = options.arraySize || faker.number.int({ min: 1, max: 3 });
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
export const generateGrpcSampleMessage = (method, options = {}) => {
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
// Custom UID generator for alphanumeric IDs (no hyphens)
const generateUID = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 21; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

import { get, each, filter } from 'lodash';
import { collectionSchema } from '@usebruno/schema';

// --- Inlined from src/common/index.js ---
export const validateSchema = (collection = {}) => {
  try {
    collectionSchema.validateSync(collection);
    return collection;
  } catch (err) {
    throw new Error('The Collection has an invalid schema: ' + err.message);
  }
};

export const transformItemsInCollection = (collection) => {
  const transformItems = (items = []) => {
    each(items, (item) => {
      if (['http', 'graphql'].includes(item.type)) {
        item.type = `${item.type}-request`;
        if (item.request.query) {
          item.request.params = item.request.query.map((queryItem) => ({
            ...queryItem,
            type: 'query',
            uid: queryItem.uid || generateUID(),
          }));
        }
        delete item.request.query;
        let multipartFormData = get(item, 'request.body.multipartForm');
        if (multipartFormData) {
          each(multipartFormData, (form) => {
            if (!form.type) {
              form.type = 'text';
            }
          });
        }
      }
      // Handle already transformed types
      if (['http-request', 'graphql-request'].includes(item.type)) {
        if (item.request.query) {
          item.request.params = item.request.query.map((queryItem) => ({
            ...queryItem,
            type: 'query',
            uid: queryItem.uid || generateUID(),
          }));
        }
        delete item.request.query;
        let multipartFormData = get(item, 'request.body.multipartForm');
        if (multipartFormData) {
          each(multipartFormData, (form) => {
            if (!form.type) {
              form.type = 'text';
            }
          });
        }
      }
      if (item.items && item.items.length) {
        transformItems(item.items);
      }
    });
  };
  transformItems(collection.items);
  return collection;
};

const isItemARequest = (item) => {
  return ['http-request', 'graphql-request'].includes(item.type);
};

export const hydrateSeqInCollection = (collection) => {
  const hydrateSeq = (items = []) => {
    let index = 1;
    each(items, (item) => {
      if (isItemARequest(item) && !item.seq) {
        item.seq = index;
        index++;
      }
      if (item.items && item.items.length) {
        hydrateSeq(item.items);
      }
    });
  };
  hydrateSeq(collection.items);
  return collection;
};
// --- End inlined ---

// Use a simple XML parser for Node.js environment
const parseXML = (xmlString) => {
  const parser = new (require('xml2js')).Parser({
    explicitArray: false,
    ignoreAttrs: false,
    mergeAttrs: true,
    xmlns: false
  });

  return new Promise((resolve, reject) => {
    parser.parseString(xmlString, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const addSuffixToDuplicateName = (item, index, allItems) => {
  // Check if the request name already exist and if so add a number suffix
  const nameSuffix = allItems.reduce((nameSuffix, otherItem, otherIndex) => {
    if (otherItem.name === item.name && otherIndex < index) {
      nameSuffix++;
    }
    return nameSuffix;
  }, 0);
  return nameSuffix !== 0 ? `${item.name}_${nameSuffix}` : item.name;
};

/**
 * Enhanced WSDL Parser based on wizdler approach
 */
class WSDLParser {
  constructor() {
    this.types = new Map();
    this.elements = new Map();
    this.complexTypes = new Map();
    this.simpleTypes = new Map();
    this.messages = new Map();
    this.portTypes = new Map();
    this.bindings = new Map();
    this.services = new Map();
    this.namespaces = new Map();
  }

  /**
   * Parse WSDL content and extract all components
   */
  async parse(wsdlContent) {
    const result = await parseXML(wsdlContent);
    const definitions = result['wsdl:definitions'] || result.definitions;

    if (!definitions) {
      throw new Error('No definitions found in WSDL');
    }

    // Extract namespaces
    this.extractNamespaces(definitions);

    // Parse types (XSD schemas)
    if (definitions['wsdl:types'] || definitions.types) {
      this.parseTypes(definitions['wsdl:types'] || definitions.types);
    }

    // Parse messages
    this.parseMessages(definitions);

    // Parse port types
    this.parsePortTypes(definitions);

    // Parse bindings
    this.parseBindings(definitions);

    // Parse services
    this.parseServices(definitions);

    return {
      targetNamespace: definitions.targetNamespace || '',
      name: definitions.name || 'WSDL Service',
      types: this.types,
      elements: this.elements,
      complexTypes: this.complexTypes,
      simpleTypes: this.simpleTypes,
      messages: this.messages,
      portTypes: this.portTypes,
      bindings: this.bindings,
      services: this.services,
      namespaces: this.namespaces
    };
  }

  /**
   * Extract all namespaces from WSDL
   */
  extractNamespaces(definitions) {
    // Extract from xmlns attributes
    for (const [key, value] of Object.entries(definitions)) {
      if (key.startsWith('xmlns:')) {
        const prefix = key.substring(6);
        this.namespaces.set(prefix, value);
      } else if (key === 'xmlns') {
        this.namespaces.set('', value);
      }
    }
  }

  /**
   * Parse WSDL types section (XSD schemas)
   */
  parseTypes(typesNode) {
    if (!typesNode) return;

    const schemas = this.getArray(typesNode['xsd:schema'] || typesNode.schema);

    for (const schema of schemas) {
      const targetNamespace = schema.targetNamespace || '';

      // Parse complex types FIRST (so they can be referenced by elements)
      const complexTypes = this.getArray(schema['xsd:complexType'] || schema.complexType);
      for (const complexType of complexTypes) {
        this.parseComplexType(complexType, targetNamespace);
      }

      // Parse simple types
      const simpleTypes = this.getArray(schema['xsd:simpleType'] || schema.simpleType);
      for (const simpleType of simpleTypes) {
        this.parseSimpleType(simpleType, targetNamespace);
      }

      // Parse elements LAST (so they can reference complex types)
      const elements = this.getArray(schema['xsd:element'] || schema.element);
      for (const element of elements) {
        this.parseElement(element, targetNamespace);
      }
    }
  }

  /**
   * Parse an XSD element
   */
  parseElement(element, namespace) {
    const key = `${namespace}:${element.name}`;
    const parsedElement = {
      name: element.name,
      namespace: namespace,
      type: element.type,
      minOccurs: element.minOccurs,
      maxOccurs: element.maxOccurs,
      nillable: element.nillable,
      form: element.form,
      attributes: [],
      elements: []
    };

    // Handle inline complex type (recursively parse children)
    if (element['xsd:complexType'] || element.complexType) {
      const complexType = element['xsd:complexType'] || element.complexType;
      // Recursively parse sequence/choice/all children as elements
      if (complexType['xsd:sequence'] || complexType.sequence) {
        const sequence = complexType['xsd:sequence'] || complexType.sequence;
        const children = this.getArray(sequence['xsd:element'] || sequence.element);
        for (const child of children) {
          // Recursively parse child element
          parsedElement.elements.push(this.parseElementInline(child, namespace));
        }
      }
      if (complexType['xsd:choice'] || complexType.choice) {
        const choice = complexType['xsd:choice'] || complexType.choice;
        const children = this.getArray(choice['xsd:element'] || choice.element);
        for (const child of children) {
          parsedElement.elements.push(this.parseElementInline(child, namespace));
        }
      }
      if (complexType['xsd:all'] || complexType.all) {
        const all = complexType['xsd:all'] || complexType.all;
        const children = this.getArray(all['xsd:element'] || all.element);
        for (const child of children) {
          parsedElement.elements.push(this.parseElementInline(child, namespace));
        }
      }
      // Parse attributes
      if (complexType['xsd:attribute'] || complexType.attribute) {
        const attributes = this.getArray(complexType['xsd:attribute'] || complexType.attribute);
        for (const attr of attributes) {
          parsedElement.attributes.push({
            name: attr.name,
            type: attr.type,
            use: attr.use,
            default: attr.default,
            fixed: attr.fixed,
            form: attr.form
          });
        }
      }
    }

    // Handle inline simple type
    if (element['xsd:simpleType'] || element.simpleType) {
      const simpleType = element['xsd:simpleType'] || element.simpleType;
      parsedElement.simpleType = this.parseSimpleTypeContent(simpleType);
    }

    // Handle referenced complex type - resolve it immediately
    if (element.type && !element['xsd:complexType'] && !element['xsd:simpleType']) {
      const typeName = element.type.replace(/^.*:/, '');
      const complexType = this.findComplexTypeByName(typeName, namespace);
      if (complexType) {
        parsedElement.elements = complexType.elements || [];
        parsedElement.attributes = complexType.attributes || [];
      }
    }

    this.elements.set(key, parsedElement);
    return parsedElement; // for inline recursion
  }

  /**
   * Helper for parsing inline child elements (does not add to elements map)
   */
  parseElementInline(element, namespace) {
    const parsedElement = {
      name: element.name,
      namespace: namespace,
      type: element.type,
      minOccurs: element.minOccurs,
      maxOccurs: element.maxOccurs,
      nillable: element.nillable,
      form: element.form,
      attributes: [],
      elements: []
    };
    // Inline complex type
    if (element['xsd:complexType'] || element.complexType) {
      const complexType = element['xsd:complexType'] || element.complexType;
      if (complexType['xsd:sequence'] || complexType.sequence) {
        const sequence = complexType['xsd:sequence'] || complexType.sequence;
        const children = this.getArray(sequence['xsd:element'] || sequence.element);
        for (const child of children) {
          parsedElement.elements.push(this.parseElementInline(child, namespace));
        }
      }
      if (complexType['xsd:choice'] || complexType.choice) {
        const choice = complexType['xsd:choice'] || complexType.choice;
        const children = this.getArray(choice['xsd:element'] || choice.element);
        for (const child of children) {
          parsedElement.elements.push(this.parseElementInline(child, namespace));
        }
      }
      if (complexType['xsd:all'] || complexType.all) {
        const all = complexType['xsd:all'] || complexType.all;
        const children = this.getArray(all['xsd:element'] || all.element);
        for (const child of children) {
          parsedElement.elements.push(this.parseElementInline(child, namespace));
        }
      }
      // Parse attributes
      if (complexType['xsd:attribute'] || complexType.attribute) {
        const attributes = this.getArray(complexType['xsd:attribute'] || complexType.attribute);
        for (const attr of attributes) {
          parsedElement.attributes.push({
            name: attr.name,
            type: attr.type,
            use: attr.use,
            default: attr.default,
            fixed: attr.fixed,
            form: attr.form
          });
        }
      }
    }
    // Inline simple type
    if (element['xsd:simpleType'] || element.simpleType) {
      const simpleType = element['xsd:simpleType'] || element.simpleType;
      parsedElement.simpleType = this.parseSimpleTypeContent(simpleType);
    }
    // Referenced complex type
    if (element.type && !element['xsd:complexType'] && !element['xsd:simpleType']) {
      const typeName = element.type.replace(/^.*:/, '');
      const complexType = this.findComplexTypeByName(typeName, namespace);
      if (complexType) {
        parsedElement.elements = complexType.elements || [];
        parsedElement.attributes = complexType.attributes || [];
      }
    }
    return parsedElement;
  }

  /**
   * Find complex type by name and namespace
   */
  findComplexTypeByName(typeName, namespace) {
    // Try with namespace
    const key = `${namespace}:${typeName}`;
    if (this.complexTypes.has(key)) {
      return this.complexTypes.get(key);
    }

    // Try without namespace
    for (const [key, complexType] of this.complexTypes) {
      if (complexType.name === typeName) {
        return complexType;
      }
    }

    return null;
  }

  /**
   * Parse an XSD complex type
   */
  parseComplexType(complexType, namespace) {
    const key = `${namespace}:${complexType.name}`;
    const parsedComplexType = {
      name: complexType.name,
      namespace: namespace,
      attributes: [],
      elements: [],
      mixed: complexType.mixed,
      abstract: complexType.abstract
    };

    this.parseComplexTypeContent(complexType, parsedComplexType);
    this.complexTypes.set(key, parsedComplexType);
  }

  /**
   * Parse complex type content (sequence, choice, all, attributes)
   */
  parseComplexTypeContent(complexType, target) {
    // Parse sequence
    if (complexType['xsd:sequence'] || complexType.sequence) {
      const sequence = complexType['xsd:sequence'] || complexType.sequence;
      this.parseSequence(sequence, target);
    }

    // Parse choice
    if (complexType['xsd:choice'] || complexType.choice) {
      const choice = complexType['xsd:choice'] || complexType.choice;
      this.parseChoice(choice, target);
    }

    // Parse all
    if (complexType['xsd:all'] || complexType.all) {
      const all = complexType['xsd:all'] || complexType.all;
      this.parseAll(all, target);
    }

    // Parse attributes
    if (complexType['xsd:attribute'] || complexType.attribute) {
      const attributes = this.getArray(complexType['xsd:attribute'] || complexType.attribute);
      for (const attr of attributes) {
        target.attributes.push({
          name: attr.name,
          type: attr.type,
          use: attr.use,
          default: attr.default,
          fixed: attr.fixed,
          form: attr.form
        });
      }
    }

    // Handle simple content with extension
    if (complexType['xsd:simpleContent'] || complexType.simpleContent) {
      const simpleContent = complexType['xsd:simpleContent'] || complexType.simpleContent;
      if (simpleContent['xsd:extension'] || simpleContent.extension) {
        const extension = simpleContent['xsd:extension'] || simpleContent.extension;
        target.baseType = extension.base;

        // Parse attributes from extension
        if (extension['xsd:attribute'] || extension.attribute) {
          const attributes = this.getArray(extension['xsd:attribute'] || extension.attribute);
          for (const attr of attributes) {
            target.attributes.push({
              name: attr.name,
              type: attr.type,
              use: attr.use,
              default: attr.default,
              fixed: attr.fixed,
              form: attr.form
            });
          }
        }
      }
    }

    // Handle complex content with extension
    if (complexType['xsd:complexContent'] || complexType.complexContent) {
      const complexContent = complexType['xsd:complexContent'] || complexType.complexContent;
      if (complexContent['xsd:extension'] || complexContent.extension) {
        const extension = complexContent['xsd:extension'] || complexContent.extension;
        target.baseType = extension.base;

        // Parse content from extension
        this.parseComplexTypeContent(extension, target);
      }
    }
  }

  /**
   * Parse sequence content
   */
  parseSequence(sequence, target) {
    const elements = this.getArray(sequence['xsd:element'] || sequence.element);
    for (const element of elements) {
      // Use parseElementInline to properly handle inline complex types and attributes
      const parsedElement = this.parseElementInline(element, target.namespace || '');
      target.elements.push(parsedElement);
    }
  }

  /**
   * Parse choice content
   */
  parseChoice(choice, target) {
    const elements = this.getArray(choice['xsd:element'] || choice.element);
    for (const element of elements) {
      // Use parseElementInline to properly handle inline complex types and attributes
      const parsedElement = this.parseElementInline(element, target.namespace || '');
      parsedElement.choice = true;
      target.elements.push(parsedElement);
    }
  }

  /**
   * Parse all content
   */
  parseAll(all, target) {
    const elements = this.getArray(all['xsd:element'] || all.element);
    for (const element of elements) {
      // Use parseElementInline to properly handle inline complex types and attributes
      const parsedElement = this.parseElementInline(element, target.namespace || '');
      parsedElement.all = true;
      target.elements.push(parsedElement);
    }
  }

  /**
   * Parse simple type
   */
  parseSimpleType(simpleType, namespace) {
    const key = `${namespace}:${simpleType.name}`;
    const parsedSimpleType = {
      name: simpleType.name,
      namespace: namespace,
      ...this.parseSimpleTypeContent(simpleType)
    };
    this.simpleTypes.set(key, parsedSimpleType);
  }

  /**
   * Parse simple type content
   */
  parseSimpleTypeContent(simpleType) {
    if (simpleType['xsd:restriction'] || simpleType.restriction) {
      const restriction = simpleType['xsd:restriction'] || simpleType.restriction;
      return {
        base: restriction.base,
        enumeration: this.getArray(restriction['xsd:enumeration'] || restriction.enumeration),
        pattern: restriction['xsd:pattern'] || restriction.pattern,
        minLength: restriction['xsd:minLength'] || restriction.minLength,
        maxLength: restriction['xsd:maxLength'] || restriction.maxLength
      };
    }
    return {};
  }

  /**
   * Parse WSDL messages
   */
  parseMessages(definitions) {
    const messages = this.getArray(definitions['wsdl:message'] || definitions.message);
    for (const message of messages) {
      const parts = this.getArray(message['wsdl:part'] || message.part);
      this.messages.set(message.name, {
        name: message.name,
        parts: parts.map(part => ({
          name: part.name,
          type: part.type,
          element: part.element
        }))
      });
    }
  }

  /**
   * Parse WSDL port types
   */
  parsePortTypes(definitions) {
    const portTypes = this.getArray(definitions['wsdl:portType'] || definitions.portType);
    for (const portType of portTypes) {
      const operations = this.getArray(portType['wsdl:operation'] || portType.operation);
      this.portTypes.set(portType.name, {
        name: portType.name,
        operations: operations.map(op => ({
          name: op.name,
          input: op['wsdl:input'] || op.input,
          output: op['wsdl:output'] || op.output,
          fault: this.getArray(op['wsdl:fault'] || op.fault)
        }))
      });
    }
  }

  /**
   * Parse WSDL bindings
   */
  parseBindings(definitions) {
    const bindings = this.getArray(definitions['wsdl:binding'] || definitions.binding);
    for (const binding of bindings) {
      const operations = this.getArray(binding['wsdl:operation'] || binding.operation);
      this.bindings.set(binding.name, {
        name: binding.name,
        type: binding.type,
        operations: operations.map(op => {
          // Robustly extract soapAction from any soap:operation child element
          let soapAction = '';
          for (const key of Object.keys(op)) {
            if (key.endsWith(':operation')) {
              const soapOp = op[key];
              if (Array.isArray(soapOp)) {
                if (soapOp[0] && soapOp[0].soapAction) {
                  soapAction = soapOp[0].soapAction;
                  break;
                }
              } else if (soapOp && soapOp.soapAction) {
                soapAction = soapOp.soapAction;
                break;
              }
            }
          }
          return {
            name: op.name,
            input: op['wsdl:input'] || op.input,
            output: op['wsdl:output'] || op.output,
            fault: this.getArray(op['wsdl:fault'] || op.fault),
            soapAction: soapAction
          };
        })
      });
    }
  }

  /**
   * Parse WSDL services
   */
  parseServices(definitions) {
    const services = this.getArray(definitions['wsdl:service'] || definitions.service);
    for (const service of services) {
      const ports = this.getArray(service['wsdl:port'] || service.port);
      this.services.set(service.name, {
        name: service.name,
        ports: ports.map(port => ({
          name: port.name,
          binding: port.binding,
          address: this.extractAddress(port)
        }))
      });
    }
  }

  /**
   * Extract service address from port
   */
  extractAddress(port) {
    // Try different address formats
    const address = port['soap:address'] || port['wsdl:address'] || port.address;
    if (address && address.location) {
      return address.location;
    }
    return '';
  }

  /**
   * Helper to ensure array
   */
  getArray(item) {
    if (!item) return [];
    return Array.isArray(item) ? item : [item];
  }
}

/**
 * Enhanced XML Sample Generator based on wizdler approach
 */
class XMLSampleGenerator {
  constructor(wsdlData) {
    this.wsdlData = wsdlData;
    this.visitedTypes = new Set();
  }

  /**
   * Generate XML sample for an element
   */
  generateSample(elementName, namespace = '') {
    const element = this.findElement(elementName, namespace);
    if (!element) {
      return `<!-- Element ${elementName} not found -->`;
    }

    return this.generateElementSample(element, 0);
  }

  /**
   * Find element by name and namespace
   */
  findElement(elementName, namespace) {
    // Try with namespace
    if (namespace) {
      const key = `${namespace}:${elementName}`;
      if (this.wsdlData.elements.has(key)) {
        return this.wsdlData.elements.get(key);
      }
    }

    // Try without namespace
    for (const [key, element] of this.wsdlData.elements) {
      if (element.name === elementName) {
        return element;
      }
    }

    return null;
  }

  /**
   * Generate sample for an element
   */
  generateElementSample(element) {
    let xml = '';

    // Add comments for optional/repetition elements
    const minOccurs = parseInt(element.minOccurs) || 1;
    const maxOccurs = element.maxOccurs || '1';

    if (minOccurs === 0) {
      xml += `<!--Optional:-->`;
    }

    if (maxOccurs === 'unbounded' || (typeof maxOccurs === 'number' && maxOccurs > 1)) {
      xml += `<!--${this.getRepetitionText(minOccurs, maxOccurs)}-->`;
    }

    // Generate attributes
    const attributes = this.generateAttributes(element);

    // Generate element content
    if (this.isSimpleType(element)) {
      xml += `<${element.name}${attributes}>${this.getSampleValue(element)}</${element.name}>`;
    } else {
      xml += `<${element.name}${attributes}>`;
      xml += this.generateComplexContent(element);
      xml += `</${element.name}>`;
    }

    return xml;
  }

  /**
   * Recursively collect all attributes from a complex type and its base types
   */
  collectAllAttributes(complexType) {
    let attributes = [];
    if (complexType && complexType.attributes) {
      attributes = attributes.concat(complexType.attributes);
    }
    // Recursively collect from base type if present
    if (complexType && complexType.baseType) {
      const baseTypeName = complexType.baseType.replace(/^.*:/, '');
      const baseType = this.findComplexType(baseTypeName);
      if (baseType) {
        attributes = attributes.concat(this.collectAllAttributes(baseType));
      }
    }
    return attributes;
  }

  /**
   * Generate attributes string
   */
  generateAttributes(element) {
    let attributes = [];

    // Add attributes from the element itself
    if (element.attributes && element.attributes.length > 0) {
      attributes = attributes.concat(element.attributes);
    }

    // Add attributes from the referenced complex type (if any, recursively)
    if (element.type) {
      const complexType = this.findComplexType(element.type);
      if (complexType) {
        const allTypeAttrs = this.collectAllAttributes(complexType);
        // Avoid duplicates by attribute name
        const existingNames = new Set(attributes.map(a => a.name));
        for (const attr of allTypeAttrs) {
          if (!existingNames.has(attr.name)) {
            attributes.push(attr);
          }
        }
      }
    }

    if (attributes.length > 0) {
      return ' ' + attributes.map(attr => `${attr.name}="?"`).join(' ');
    }
    return '';
  }

  /**
   * Check if element is simple type
   */
  isSimpleType(element) {
    if (element.simpleType) return true;

    const type = element.type;
    if (!type) return false;

    // Check if it's a built-in simple type
    const simpleTypes = [
      'string', 'int', 'integer', 'long', 'short', 'byte', 'boolean', 'float', 'double', 'decimal',
      'date', 'dateTime', 'time', 'duration', 'gYear', 'gYearMonth', 'gMonth', 'gMonthDay', 'gDay',
      'hexBinary', 'base64Binary', 'anyURI', 'QName', 'NOTATION', 'normalizedString', 'token',
      'language', 'Name', 'NCName', 'ID', 'IDREF', 'IDREFS', 'ENTITY', 'ENTITIES', 'NMTOKEN', 'NMTOKENS'
    ];

    const typeName = type.replace(/^.*:/, '');
    return simpleTypes.includes(typeName);
  }

  /**
   * Get sample value for simple type
   */
  getSampleValue(element) {
    if (element.simpleType && element.simpleType.enumeration && element.simpleType.enumeration.length > 0) {
      return element.simpleType.enumeration[0].value || '?';
    }

    const type = element.type;
    if (!type) return '?';

    const typeName = type.replace(/^.*:/, '');

    switch (typeName) {
      case 'string': return 'string';
      case 'int':
      case 'integer':
      case 'long':
      case 'short':
      case 'byte': return '0';
      case 'boolean': return 'true';
      case 'float':
      case 'double':
      case 'decimal': return '0.0';
      case 'date': return '2024-01-01';
      case 'dateTime': return '2024-01-01T00:00:00Z';
      case 'time': return '00:00:00';
      default: return '?';
    }
  }

  /**
   * Generate complex content
   */
  generateComplexContent(element) {
    let xml = '';

    // Handle inline complex type (elements already parsed)
    if (element.elements && element.elements.length > 0) {
      for (const child of element.elements) {
        xml += this.generateElementSample(child);
      }
    }

    // Handle referenced complex type - this is the key fix
    if (element.type) {
      const complexType = this.findComplexType(element.type);
      if (complexType) {
        xml += this.generateComplexTypeSample(complexType);
      } else {
        // If we can't find the complex type, try to find it as an element
        const elementType = this.findElement(element.type.replace(/^.*:/, ''), '');
        if (elementType) {
          xml += this.generateElementSample(elementType);
        }
      }
    }

    return xml;
  }

  /**
   * Find complex type by name
   */
  findComplexType(typeName) {
    const cleanTypeName = typeName.replace(/^.*:/, '');

    // First try exact match
    for (const [key, complexType] of this.wsdlData.complexTypes) {
      if (complexType.name === cleanTypeName) {
        return complexType;
      }
    }

    // Try with namespace prefix
    for (const [key, complexType] of this.wsdlData.complexTypes) {
      if (key.endsWith(`:${cleanTypeName}`) || key === cleanTypeName) {
        return complexType;
      }
    }

    return null;
  }

  /**
   * Generate sample for complex type
   */
  generateComplexTypeSample(complexType) {
    if (this.visitedTypes.has(complexType.name)) {
      return '<!-- Recursive type detected -->';
    }

    this.visitedTypes.add(complexType.name);
    let xml = '';

    if (complexType.elements && complexType.elements.length > 0) {
      for (const element of complexType.elements) {
        xml += this.generateElementSample(element);
      }
    }

    this.visitedTypes.delete(complexType.name);
    return xml;
  }

  /**
   * Get repetition text
   */
  getRepetitionText(minOccurs, maxOccurs) {
    if (minOccurs === 0 && maxOccurs === 'unbounded') {
      return '0 or more repetitions';
    } else if (minOccurs === 1 && maxOccurs === 'unbounded') {
      return '1 or more repetitions';
    } else if (typeof maxOccurs === 'number') {
      return `${minOccurs} to ${maxOccurs} repetitions:`;
    } else {
      return '0 or more repetitions';
    }
  }
}

/**
 * Generate SOAP envelope with example payload
 */
const generateSOAPEnvelope = (operation, wsdlData) => {
  const inputMessage = operation.input?.message || '';
  const inputMessageName = typeof inputMessage === 'string' && inputMessage.includes(':') ? inputMessage.split(':')[1] : inputMessage;

  // Find the message definition
  const message = wsdlData.messages.get(inputMessageName);
  if (!message || !message.parts || message.parts.length === 0) {
    return '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><!-- No message parts found --></soap:Body></soap:Envelope>';
  }

  const part = message.parts[0];
  const elementName = part.element || part.type || '';

  if (!elementName) {
    return '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><!-- No element found --></soap:Body></soap:Envelope>';
  }

  // Extract element name and namespace
  let name, namespace;
  if (elementName.includes(':')) {
    [namespace, name] = elementName.split(':');
  } else {
    name = elementName;
    namespace = '';
  }

  // Generate XML sample
  const generator = new XMLSampleGenerator(wsdlData);
  const xmlSample = generator.generateSample(name, namespace);

  return `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body>${xmlSample}</soap:Body></soap:Envelope>`;
};

/**
 * Transform WSDL operation to Bruno request item
 */
const transformWSDLOperation = (operation, wsdlData, serviceLocation, index, allOperations, bindingOperation = null) => {
  // Create a temporary object with the name property for duplicate checking
  const tempItem = { name: operation.name };
  const name = addSuffixToDuplicateName(tempItem, index, allOperations);
  const soapEnvelope = generateSOAPEnvelope(operation, wsdlData);

  // Use soapAction from binding operation if available, otherwise fallback to constructed value
  let soapAction = '';
  if (bindingOperation && bindingOperation.soapAction) {
    soapAction = bindingOperation.soapAction;
  } else {
    // Fallback to constructed value
    soapAction = `"${wsdlData.targetNamespace || ''}${operation.name}"`;
  }

  const brunoRequestItem = {
    uid: generateUID(),
    name,
    type: 'http-request',
    request: {
      url: serviceLocation || '',
      method: 'POST',
      auth: {
        mode: 'none',
        basic: null,
        bearer: null,
        digest: null
      },
      headers: [
        {
          uid: generateUID(),
          name: 'Content-Type',
          value: 'text/xml; charset=utf-8',
          description: '',
          enabled: true
        },
        {
          uid: generateUID(),
          name: 'SOAPAction',
          value: soapAction,
          description: '',
          enabled: true
        }
      ],
      params: [],
      body: {
        mode: 'xml',
        json: null,
        text: null,
        xml: soapEnvelope,
        formUrlEncoded: [],
        multipartForm: []
      },
      script: {
        res: null
      }
    }
  };

  return brunoRequestItem;
};

/**
 * Parse WSDL collection and transform to Bruno format
 */
const parseWSDLCollection = (wsdlData) => {
  const collection = {
    uid: generateUID(),
    version: '1',
    name: wsdlData.name,
    items: []
  };

  // Flatten the structure to avoid duplicate folder names
  // Group operations by service and port, but create a single folder per service
  for (const [serviceName, service] of wsdlData.services) {
    const serviceFolder = {
      uid: generateUID(),
      name: serviceName,
      type: 'folder',
      items: []
    };

    // Collect all operations from all ports in this service
    const allOperations = [];

    for (const port of service.ports) {
      // Find operations for this port
      const bindingName = port.binding && typeof port.binding === 'string' && port.binding.includes(':') ? port.binding.split(':')[1] : port.binding;
      const binding = wsdlData.bindings.get(bindingName);

      if (binding) {
        const bindingType = binding.type && typeof binding.type === 'string' && binding.type.includes(':') ? binding.type.split(':')[1] : binding.type;
        const portType = wsdlData.portTypes.get(bindingType);

        if (portType) {
          for (const portTypeOp of portType.operations) {
            // Find the corresponding binding operation by name
            const bindingOp = binding.operations.find(bop => bop.name === portTypeOp.name);
            if (bindingOp) {
              const request = transformWSDLOperation(portTypeOp, wsdlData, port.address, allOperations.length, binding.operations, bindingOp);
              allOperations.push(request);
            }
          }
        }
      }
    }

    // Add all operations directly to the service folder
    serviceFolder.items = allOperations;

    if (serviceFolder.items.length > 0) {
      collection.items.push(serviceFolder);
    }
  }

  return collection;
};

/**
 * Convert WSDL content to Bruno collection
 */
export const wsdlToBruno = async (wsdlContent) => {
  try {
    if (typeof wsdlContent !== 'string') {
      throw new Error('WSDL content must be a string');
    }

    // Parse WSDL using enhanced parser
    const parser = new WSDLParser();
    const wsdlData = await parser.parse(wsdlContent);

    const collection = parseWSDLCollection(wsdlData);
    const transformedCollection = transformItemsInCollection(collection);
    const hydratedCollection = hydrateSeqInCollection(transformedCollection);
    const validatedCollection = validateSchema(hydratedCollection);

    return validatedCollection;
  } catch (err) {
    console.error(err);
    throw new Error('Import WSDL collection failed: ' + err.message);
  }
};

export { WSDLParser, XMLSampleGenerator };
export default wsdlToBruno;

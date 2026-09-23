// Custom UID generator for alphanumeric IDs (no hyphens)
const generateUID = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 21; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

import { get, each } from 'lodash';
import { collectionSchema } from '@usebruno/schema';
import parseXML from './parse-xml.js';
import { collectWsdlSchemas, resolveQName } from './schema-graph.js';

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
            uid: queryItem.uid || generateUID()
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
            uid: queryItem.uid || generateUID()
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
  parseDefinitions(definitions, schemas = []) {
    // Extract namespaces
    this.extractNamespaces(definitions);

    // Parse types (XSD schemas, inline and externally resolved)
    this.parseTypes(schemas);

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
   * Parse WSDL types (XSD schemas)
   */
  parseTypes(schemas = []) {
    for (const { node, prefixMap } of schemas) {
      const targetNamespace = node.targetNamespace || '';

      const complexTypes = this.getArray(node['xsd:complexType'] || node.complexType);
      for (const complexType of complexTypes) {
        this.parseComplexType(complexType, targetNamespace, prefixMap);
      }

      const simpleTypes = this.getArray(node['xsd:simpleType'] || node.simpleType);
      for (const simpleType of simpleTypes) {
        this.parseSimpleType(simpleType, targetNamespace);
      }
    }

    for (const { node, prefixMap } of schemas) {
      const targetNamespace = node.targetNamespace || '';

      const elements = this.getArray(node['xsd:element'] || node.element);
      for (const element of elements) {
        this.parseElement(element, targetNamespace, prefixMap);
      }
    }
  }

  /**
   * Parse an element from the WSDL
   */
  parseElement(element, namespace, prefixMap) {
    const parsedElement = this.parseElementInline(element, namespace, prefixMap);
    this.elements.set(`${namespace}:${element.name}`, parsedElement);
    return parsedElement;
  }

  /**
   * Parse an inline element from the WSDL
   */
  parseElementInline(element, namespace, prefixMap) {
    const parsedElement = {
      name: element.name,
      namespace: namespace,
      type: element.type,
      typeNamespace: element.type ? resolveQName(element.type, prefixMap).namespace : undefined,
      ref: element.ref,
      refNamespace: element.ref ? resolveQName(element.ref, prefixMap).namespace : undefined,
      minOccurs: element.minOccurs,
      maxOccurs: element.maxOccurs,
      nillable: element.nillable,
      form: element.form,
      attributes: [],
      elements: []
    };

    // Inline complex type
    const inlineComplexType = element['xsd:complexType'] || element.complexType;
    if (inlineComplexType) {
      this.parseComplexTypeContent(inlineComplexType, parsedElement, prefixMap);
    }

    // Inline simple type
    const inlineSimpleType = element['xsd:simpleType'] || element.simpleType;
    if (inlineSimpleType) {
      parsedElement.simpleType = this.parseSimpleTypeContent(inlineSimpleType);
    }

    return parsedElement;
  }

  /**
   * Parse an XSD complex type
   */
  parseComplexType(complexType, namespace, prefixMap) {
    const key = `${namespace}:${complexType.name}`;
    const parsedComplexType = {
      name: complexType.name,
      namespace: namespace,
      attributes: [],
      elements: [],
      mixed: complexType.mixed,
      abstract: complexType.abstract
    };

    this.parseComplexTypeContent(complexType, parsedComplexType, prefixMap);
    this.complexTypes.set(key, parsedComplexType);
  }

  /**
   * Parse complex type content (sequence, choice, all, attributes)
   */
  parseComplexTypeContent(complexType, target, prefixMap) {
    this.parseParticles(complexType, target, prefixMap, false);

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
        target.baseTypeNamespace = extension.base ? resolveQName(extension.base, prefixMap).namespace : undefined;

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
        target.baseTypeNamespace = extension.base ? resolveQName(extension.base, prefixMap).namespace : undefined;

        // Parse content from extension
        this.parseComplexTypeContent(extension, target, prefixMap);
      }
    }
  }

  /**
   * Parse particles of a content model (sequence, choice, all)
   */
  parseParticles(particle, target, prefixMap, inChoice) {
    for (const [key, value] of Object.entries(particle)) {
      const particleName = key.startsWith('xsd:') ? key.slice('xsd:'.length) : key;

      if (particleName === 'element') {
        for (const element of this.getArray(value)) {
          const parsedElement = this.parseElementInline(element, target.namespace || '', prefixMap);
          if (inChoice) {
            parsedElement.choice = true;
          }
          target.elements.push(parsedElement);
        }
      } else if (particleName === 'sequence' || particleName === 'all' || particleName === 'choice') {
        for (const nested of this.getArray(value)) {
          this.parseParticles(nested, target, prefixMap, inChoice || particleName === 'choice');
        }
      }
    }
  }

  /**
   * Parse a named simple type
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
        parts: parts.map((part) => ({
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
        operations: operations.map((op) => ({
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
        operations: operations.map((op) => {
          // Robustly extract soapAction from any soap:operation child element
          let soapAction = null;
          for (const key of Object.keys(op)) {
            if (key.endsWith(':operation')) {
              const soapOp = op[key];
              if (Array.isArray(soapOp)) {
                if (soapOp[0] && soapOp[0].soapAction !== undefined) {
                  soapAction = soapOp[0].soapAction;
                  break;
                }
              } else if (soapOp && soapOp.soapAction !== undefined) {
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
        ports: ports.map((port) => ({
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
    this.visitedRefs = new Set();
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
      // no element found within the namespace
      return null;
    }

    // Try without namespace
    for (const [, element] of this.wsdlData.elements) {
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
    // A ref= particle stands in for a global element
    if (element.ref) {
      const refLocal = element.ref.replace(/^.*:/, '');
      const target = this.findElement(refLocal, element.refNamespace);
      if (!target) {
        return `<!-- Element ${element.ref} not found -->`;
      }
      const refKey = `${element.refNamespace || ''}:${refLocal}`;
      if (this.visitedRefs.has(refKey)) {
        return '<!-- Recursive element reference detected -->';
      }
      this.visitedRefs.add(refKey);
      const xml = this.generateElementSample({
        ...target,
        minOccurs: element.minOccurs,
        maxOccurs: element.maxOccurs
      });
      this.visitedRefs.delete(refKey);
      return xml;
    }

    let xml = '';

    // Add comments for optional/repetition elements
    const minOccurs = element.minOccurs == null ? 1 : parseInt(element.minOccurs, 10) || 0;
    const maxOccurs = element.maxOccurs == null ? '1' : element.maxOccurs;
    const maxOccursCount = maxOccurs === 'unbounded' ? Infinity : parseInt(maxOccurs, 10) || 1;

    if (minOccurs === 0) {
      xml += `<!--Optional:-->`;
    }

    if (maxOccursCount > 1) {
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
  collectAllAttributes(node, kind = 'type', seenNodes = new Set()) {
    let attributes = [];
    if (!node || !this.enterNode(node, kind, seenNodes)) {
      return attributes;
    }

    if (node.attributes) {
      attributes = attributes.concat(node.attributes);
    }
    // Recursively collect from base type if present
    if (node.baseType) {
      const baseType = this.findComplexType(node.baseType, node.baseTypeNamespace);
      if (baseType) {
        attributes = attributes.concat(this.collectAllAttributes(baseType, 'type', seenNodes));
      }
    }
    return attributes;
  }

  /**
   * Mark a node as entered while walking a derivation chain
   */
  enterNode(node, kind, seenNodes) {
    if (!node.name) {
      return true;
    }
    const key = `${kind}:${node.namespace || ''}:${node.name}`;
    if (seenNodes.has(key)) {
      return false;
    }
    seenNodes.add(key);
    return true;
  }

  /**
   * Collect the element particles of a complex type, base-type content first
   */
  collectAllElements(node, kind = 'type', seenNodes = new Set()) {
    let elements = [];
    if (!node || !this.enterNode(node, kind, seenNodes)) {
      return elements;
    }

    if (node.baseType) {
      const baseType = this.findComplexType(node.baseType, node.baseTypeNamespace);
      if (baseType) {
        elements = elements.concat(this.collectAllElements(baseType, 'type', seenNodes));
      }
    }

    if (node.elements) {
      elements = elements.concat(node.elements);
    }
    return elements;
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
      const complexType = this.findComplexType(element.type, element.typeNamespace);
      if (complexType) {
        const allTypeAttrs = this.collectAllAttributes(complexType);
        // Avoid duplicates by attribute name
        const existingNames = new Set(attributes.map((a) => a.name));
        for (const attr of allTypeAttrs) {
          if (!existingNames.has(attr.name)) {
            attributes.push(attr);
          }
        }
      }
    }

    if (attributes.length > 0) {
      return ' ' + attributes.map((attr) => `${attr.name}="?"`).join(' ');
    }
    return '';
  }

  /**
   * Check if element is a simple type
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
    if (simpleTypes.includes(typeName)) {
      return true;
    }

    return !!this.findSimpleType(typeName, element.typeNamespace);
  }

  builtinSampleValue(typeName) {
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
      default: return null;
    }
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

    const builtinValue = this.builtinSampleValue(typeName);
    if (builtinValue != null) {
      return builtinValue;
    }

    const namedSimpleType = this.findSimpleType(typeName, element.typeNamespace);
    if (namedSimpleType) {
      if (namedSimpleType.enumeration && namedSimpleType.enumeration.length > 0) {
        return namedSimpleType.enumeration[0].value || '?';
      }
      if (namedSimpleType.base) {
        const baseValue = this.builtinSampleValue(namedSimpleType.base.replace(/^.*:/, ''));
        if (baseValue != null) {
          return baseValue;
        }
      }
    }

    return '?';
  }

  generateElementList(elements) {
    let xml = '';
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i];
      if (element.choice && (i === 0 || !elements[i - 1].choice)) {
        let choiceCount = 0;
        while (i + choiceCount < elements.length && elements[i + choiceCount].choice) {
          choiceCount++;
        }
        xml += `<!--You have a CHOICE of the next ${choiceCount} items at this level-->`;
      }
      xml += this.generateElementSample(element);
    }
    return xml;
  }

  /**
   * Generate the children of a non-leaf element
   */
  generateComplexContent(element) {
    let xml = '';

    // Handle inline complex type
    const inlineElements = this.collectAllElements(element, 'element');
    if (inlineElements.length > 0) {
      xml += this.generateElementList(inlineElements);
    }

    // Handle referenced complex type - this is the key fix
    if (element.type) {
      const complexType = this.findComplexType(element.type, element.typeNamespace);
      if (complexType) {
        xml += this.generateComplexTypeSample(complexType);
      } else {
        // If we can't find the complex type, try to find it as an element
        const elementType = this.findElement(element.type.replace(/^.*:/, ''), element.typeNamespace);
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
  findComplexType(typeName, namespace) {
    const cleanTypeName = typeName.replace(/^.*:/, '');

    if (namespace) {
      const key = `${namespace}:${cleanTypeName}`;
      if (this.wsdlData.complexTypes.has(key)) {
        return this.wsdlData.complexTypes.get(key);
      }

      return null;
    }

    for (const [, complexType] of this.wsdlData.complexTypes) {
      if (complexType.name === cleanTypeName) {
        return complexType;
      }
    }

    return null;
  }

  /**
   * Find named simple type
   */
  findSimpleType(typeName, namespace) {
    const cleanTypeName = typeName.replace(/^.*:/, '');

    if (namespace) {
      const key = `${namespace}:${cleanTypeName}`;
      if (this.wsdlData.simpleTypes.has(key)) {
        return this.wsdlData.simpleTypes.get(key);
      }
      return null;
    }

    for (const [, simpleType] of this.wsdlData.simpleTypes) {
      if (simpleType.name === cleanTypeName) {
        return simpleType;
      }
    }

    return null;
  }

  /**
   * Generate sample for complex type
   */
  generateComplexTypeSample(complexType) {
    const typeKey = `${complexType.namespace || ''}:${complexType.name}`;
    if (this.visitedTypes.has(typeKey)) {
      return '<!-- Recursive type detected -->';
    }

    this.visitedTypes.add(typeKey);
    let xml = '';

    const elements = this.collectAllElements(complexType);
    if (elements.length > 0) {
      xml += this.generateElementList(elements);
    }

    this.visitedTypes.delete(typeKey);
    return xml;
  }

  /**
   * Get repetition text for the comment above a repeatable element
   */
  getRepetitionText(minOccurs, maxOccurs) {
    if (maxOccurs === 'unbounded') {
      return `${minOccurs} or more repetitions:`;
    }
    return `${minOccurs} to ${maxOccurs} repetitions:`;
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

  // Extract element name and its namespace
  let name, namespace;
  if (elementName.includes(':')) {
    const [prefix, local] = elementName.split(':');
    name = local;
    namespace = wsdlData.namespaces.get(prefix) || '';
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

  // Use soapAction declared on the binding operation if present
  let soapAction = '';
  if (bindingOperation && bindingOperation.soapAction != null) {
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
 * Parse WSDL collection to Bruno collection
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
            const bindingOp = binding.operations.find((bop) => bop.name === portTypeOp.name);
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
export const wsdlToBruno = async (wsdlContent, { uri, resolve } = {}) => {
  try {
    if (typeof wsdlContent !== 'string') {
      throw new Error('WSDL content must be a string');
    }

    let result;
    try {
      result = await parseXML(wsdlContent);
    } catch (err) {
      console.error(err);
      throw new Error('The file is not valid XML');
    }
    const definitions = result['wsdl:definitions'] || result.definitions;

    if (!definitions) {
      throw new Error('No definitions found in WSDL');
    }

    const { schemas, warnings } = await collectWsdlSchemas({ definitions, uri, resolve });
    for (const warning of warnings) {
      console.warn(`WSDL import: ${warning}`);
    }

    const parser = new WSDLParser();
    const wsdlData = parser.parseDefinitions(definitions, schemas);

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

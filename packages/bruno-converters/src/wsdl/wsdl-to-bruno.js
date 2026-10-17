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
import parseXML, { XML_POSITION_KEY } from './parse-xml.js';
import { collectWsdlSchemas, resolveQName } from './schema-graph.js';

const PARTICLE_NAMES = ['element', 'any', 'group', 'choice', 'sequence', 'all'];

const SOAP_ENVELOPE_PREFIX = 'soap';
const SOAP_ENVELOPE_NAMESPACE = 'http://schemas.xmlsoap.org/soap/envelope/';
const RESERVED_PREFIXES = new Set([SOAP_ENVELOPE_PREFIX, 'xml', 'xmlns']);

// Re-escape special characters before writing them into an attribute
const escapeXmlAttribute = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

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
    this.prefixDeclarations = [];
    this.modelGroups = new Map();
    this.expandingModelGroups = new Set();
    this.choiceGroupCount = 0;
  }

  /**
   * Parse WSDL content and extract all components
   */
  parseDefinitions(definitions, schemas = []) {
    // Extract namespaces
    this.extractNamespaces(definitions);

    // Parse types (XSD schemas, inline and externally resolved)
    this.parseTypes(schemas);
    this.collectPrefixDeclarations(schemas);

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
      namespaces: this.namespaces,
      prefixDeclarations: this.prefixDeclarations
    };
  }

  collectPrefixDeclarations(schemas) {
    for (const [prefix, namespace] of this.namespaces) {
      this.prefixDeclarations.push({ prefix, namespace });
    }
    for (const { prefixMap } of schemas) {
      for (const [prefix, namespace] of Object.entries(prefixMap)) {
        this.prefixDeclarations.push({ prefix, namespace });
      }
    }
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
    const schemaContexts = schemas.map(({ node, prefixMap }) => ({
      node,
      targetNamespace: node.targetNamespace || '',
      prefixMap,
      elementFormDefault: node.elementFormDefault || 'unqualified'
    }));

    for (const schema of schemaContexts) {
      const modelGroups = this.getArray(schema.node['xsd:group'] || schema.node.group);
      for (const modelGroup of modelGroups) {
        this.modelGroups.set(`${schema.targetNamespace}:${modelGroup.name}`, { node: modelGroup, schema });
      }
    }

    for (const schema of schemaContexts) {
      const complexTypes = this.getArray(schema.node['xsd:complexType'] || schema.node.complexType);
      for (const complexType of complexTypes) {
        this.parseComplexType(complexType, schema);
      }

      const simpleTypes = this.getArray(schema.node['xsd:simpleType'] || schema.node.simpleType);
      for (const simpleType of simpleTypes) {
        this.parseSimpleType(simpleType, schema.targetNamespace);
      }
    }

    for (const schema of schemaContexts) {
      const elements = this.getArray(schema.node['xsd:element'] || schema.node.element);
      for (const element of elements) {
        this.parseElement(element, schema);
      }
    }
  }

  /**
   * Parse a global element from the WSDL
   */
  parseElement(element, schema) {
    const parsedElement = this.parseElementInline(element, schema, true);
    this.elements.set(`${schema.targetNamespace}:${element.name}`, parsedElement);
    return parsedElement;
  }

  /**
   * Parse an inline element from the WSDL
   */
  parseElementInline(element, schema, qualified) {
    const parsedElement = {
      name: element.name,
      namespace: schema.targetNamespace,
      qualified,
      type: element.type,
      typeNamespace: element.type ? resolveQName(element.type, schema.prefixMap).namespace : undefined,
      ref: element.ref,
      refNamespace: element.ref ? resolveQName(element.ref, schema.prefixMap).namespace : undefined,
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
      this.parseComplexTypeContent(inlineComplexType, parsedElement, schema);
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
  parseComplexType(complexType, schema) {
    const key = `${schema.targetNamespace}:${complexType.name}`;
    const parsedComplexType = {
      name: complexType.name,
      namespace: schema.targetNamespace,
      attributes: [],
      elements: [],
      mixed: complexType.mixed,
      abstract: complexType.abstract
    };

    this.parseComplexTypeContent(complexType, parsedComplexType, schema);
    this.complexTypes.set(key, parsedComplexType);
  }

  /**
   * Parse complex type content (sequence, choice, all, attributes)
   */
  parseComplexTypeContent(complexType, target, schema) {
    this.parseParticles(complexType, target, schema, []);

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
        target.baseTypeNamespace = extension.base ? resolveQName(extension.base, schema.prefixMap).namespace : undefined;

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
        target.baseTypeNamespace = extension.base ? resolveQName(extension.base, schema.prefixMap).namespace : undefined;

        // Parse content from extension
        this.parseComplexTypeContent(extension, target, schema);
      }
    }
  }

  /**
   * Parse particles of a content model (sequence, choice, all)
   */
  parseParticles(particle, target, schema, choicePath) {
    for (const { name, node } of this.orderedParticles(particle)) {
      if (name === 'element') {
        this.addElement(node, target, schema, choicePath);
      } else if (name === 'any') {
        this.addAnyElement(target, choicePath);
      } else if (name === 'group') {
        this.expandModelGroup(node, target, schema, choicePath);
      } else if (name === 'choice') {
        this.parseChoiceBranches(node, target, schema, choicePath, ++this.choiceGroupCount, 0);
      } else {
        this.parseParticles(node, target, schema, choicePath);
      }
    }
  }

  /**
   * Parse the branches of an xs:choice
   */
  parseChoiceBranches(choice, target, schema, choicePath, group, branch) {
    for (const { name, node } of this.orderedParticles(choice)) {
      if (name === 'element') {
        this.addElement(node, target, schema, [...choicePath, { group, branch: branch++ }]);
      } else if (name === 'any') {
        this.addAnyElement(target, [...choicePath, { group, branch: branch++ }]);
      } else if (name === 'group') {
        this.expandModelGroup(node, target, schema, [...choicePath, { group, branch: branch++ }]);
      } else if (name === 'choice') {
        branch = this.parseChoiceBranches(node, target, schema, choicePath, group, branch);
      } else {
        this.parseParticles(node, target, schema, [...choicePath, { group, branch: branch++ }]);
      }
    }
    return branch;
  }

  /**
   * The child particles of a content model in document order
   */
  orderedParticles(particle) {
    const particles = [];
    for (const [key, value] of Object.entries(particle)) {
      const name = key.startsWith('xsd:') ? key.slice('xsd:'.length) : key;
      if (!PARTICLE_NAMES.includes(name)) {
        continue;
      }
      for (const node of this.getArray(value)) {
        particles.push({ name, node });
      }
    }
    return particles.sort((a, b) => a.node[XML_POSITION_KEY] - b.node[XML_POSITION_KEY]);
  }

  addElement(element, target, schema, choicePath) {
    const qualified = (element.form || schema.elementFormDefault) === 'qualified';
    const parsedElement = this.parseElementInline(element, schema, qualified);
    if (choicePath.length > 0) {
      parsedElement.choicePath = choicePath;
    }
    target.elements.push(parsedElement);
  }

  /**
   * Expand an xs:group reference in place
   */
  expandModelGroup(groupRef, target, schema, choicePath) {
    // add a check to skip groups with maxOccurs of 0
    if (!groupRef.ref || groupRef.maxOccurs === '0') {
      return;
    }

    const { namespace, local } = resolveQName(groupRef.ref, schema.prefixMap);
    const key = this.findModelGroupKey(local, namespace);

    if (!key || this.expandingModelGroups.has(key)) {
      return;
    }

    const modelGroup = this.modelGroups.get(key);
    this.expandingModelGroups.add(key);
    this.parseParticles(modelGroup.node, target, modelGroup.schema, choicePath);
    this.expandingModelGroups.delete(key);
  }

  /**
   * Find the key of a named model group
   */
  findModelGroupKey(name, namespace) {
    if (namespace) {
      const key = `${namespace}:${name}`;
      return this.modelGroups.has(key) ? key : null;
    }

    for (const [key, modelGroup] of this.modelGroups) {
      if (modelGroup.node.name === name) {
        return key;
      }
    }

    return null;
  }

  /**
   * Record an xs:any as a marker the generator renders as a comment
   */
  addAnyElement(target, choicePath) {
    const anyElement = { anyElement: true };
    if (choicePath.length > 0) {
      anyElement.choicePath = choicePath;
    }
    target.elements.push(anyElement);
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
    this.prefixes = new Map();
  }

  getPrefix(namespace) {
    if (this.prefixes.has(namespace)) {
      return this.prefixes.get(namespace);
    }

    const taken = new Set([...RESERVED_PREFIXES, ...this.prefixes.values()]);
    let prefix = null;
    for (const declaration of this.wsdlData.prefixDeclarations) {
      if (declaration.namespace === namespace && declaration.prefix && !taken.has(declaration.prefix)) {
        prefix = declaration.prefix;
        break;
      }
    }
    for (let i = 1; prefix === null; i++) {
      if (!taken.has(`ns${i}`)) {
        prefix = `ns${i}`;
      }
    }

    this.prefixes.set(namespace, prefix);
    return prefix;
  }

  getTagName(element) {
    if (element.qualified && element.namespace) {
      return `${this.getPrefix(element.namespace)}:${element.name}`;
    }
    return element.name;
  }

  getNamespaceDeclarations() {
    let declarations = '';
    for (const [namespace, prefix] of this.prefixes) {
      declarations += ` xmlns:${prefix}="${escapeXmlAttribute(namespace)}"`;
    }
    return declarations;
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
    const tagName = this.getTagName(element);

    // Generate element content
    if (this.isSimpleType(element)) {
      xml += `<${tagName}${attributes}>${this.getSampleValue(element)}</${tagName}>`;
    } else {
      xml += `<${tagName}${attributes}>`;
      xml += this.generateComplexContent(element);
      xml += `</${tagName}>`;
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
      xml += this.generateChoiceComments(elements, i);
      if (elements[i].anyElement) {
        xml += '<!--You may enter ANY elements at this point-->';
      } else {
        xml += this.generateElementSample(elements[i]);
      }
    }
    return xml;
  }

  generateChoiceComments(elements, index) {
    const choicePath = elements[index].choicePath || [];
    const previousPath = (index > 0 && elements[index - 1].choicePath) || [];
    let xml = '';

    for (let depth = 0; depth < choicePath.length; depth++) {
      const previous = previousPath[depth];
      if (previous && previous.group === choicePath[depth].group) {
        continue;
      }
      const count = this.countChoiceBranches(elements, index, depth, choicePath[depth].group);
      xml += `<!--You have a CHOICE of the next ${count} items at this level-->`;
    }
    return xml;
  }

  countChoiceBranches(elements, start, depth, group) {
    const seenBranches = new Set();
    for (let i = start; i < elements.length; i++) {
      const step = (elements[i].choicePath || [])[depth];
      if (!step || step.group !== group) {
        break;
      }
      seenBranches.add(step.branch);
    }
    return seenBranches.size;
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

const wrapInSOAPEnvelope = (body, namespaceDeclarations = '') => {
  const envelopeTag = `${SOAP_ENVELOPE_PREFIX}:Envelope`;
  const bodyTag = `${SOAP_ENVELOPE_PREFIX}:Body`;
  return `<${envelopeTag} xmlns:${SOAP_ENVELOPE_PREFIX}="${SOAP_ENVELOPE_NAMESPACE}"${namespaceDeclarations}>`
    + `<${bodyTag}>${body}</${bodyTag}></${envelopeTag}>`;
};

/**
 * Generate SOAP envelope with example payload
 */
const generateSOAPEnvelope = (operation, wsdlData) => {
  const inputMessage = operation.input?.message || '';
  const inputMessageName = typeof inputMessage === 'string' && inputMessage.includes(':') ? inputMessage.split(':')[1] : inputMessage;

  // Find the message definition
  const message = wsdlData.messages.get(inputMessageName);
  if (!message || !message.parts || message.parts.length === 0) {
    return wrapInSOAPEnvelope('<!-- No message parts found -->');
  }

  const part = message.parts[0];
  const elementName = part.element || part.type || '';

  if (!elementName) {
    return wrapInSOAPEnvelope('<!-- No element found -->');
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

  // Generate XML sample and declare the namespaces
  const generator = new XMLSampleGenerator(wsdlData);
  const xmlSample = generator.generateSample(name, namespace);

  return wrapInSOAPEnvelope(xmlSample, generator.getNamespaceDeclarations());
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

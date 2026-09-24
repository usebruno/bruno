import parseXML from './parse-xml.js';

const MAX_SCHEMA_DOCUMENTS = 64;

const getArray = (item) => {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
};

const renameSchemaPrefix = (node, prefix) => {
  if (Array.isArray(node)) {
    return node.map((item) => renameSchemaPrefix(item, prefix));
  }
  if (node && typeof node === 'object') {
    const renamed = {};
    for (const [key, value] of Object.entries(node)) {
      const newKey = key.startsWith(`${prefix}:`) ? `xsd:${key.slice(prefix.length + 1)}` : key;
      renamed[newKey] = renameSchemaPrefix(value, prefix);
    }
    return renamed;
  }
  return node;
};

const normalizeSchemaNode = (schemaNode, prefix) => {
  return prefix && prefix !== 'xsd' ? renameSchemaPrefix(schemaNode, prefix) : schemaNode;
};

const buildPrefixMap = (node, parentMap = {}) => {
  const map = { ...parentMap };
  for (const [key, value] of Object.entries(node)) {
    if (key === 'xmlns' && typeof value === 'string') {
      map[''] = value;
    } else if (key.startsWith('xmlns:') && typeof value === 'string') {
      map[key.slice('xmlns:'.length)] = value;
    }
  }
  return map;
};

const resolveQName = (qname, prefixMap = {}) => {
  if (typeof qname !== 'string' || !qname) {
    return { namespace: undefined, local: qname };
  }
  const idx = qname.indexOf(':');
  if (idx === -1) {
    return { namespace: prefixMap[''], local: qname };
  }
  return { namespace: prefixMap[qname.slice(0, idx)], local: qname.slice(idx + 1) };
};

const extractSchemaNodesFromTypes = (typesNode) => {
  const nodes = [];
  for (const [key, value] of Object.entries(typesNode)) {
    if (key === 'schema') {
      nodes.push(...getArray(value));
    } else if (key.endsWith(':schema')) {
      const prefix = key.slice(0, -':schema'.length);
      for (const schemaNode of getArray(value)) {
        nodes.push(normalizeSchemaNode(schemaNode, prefix));
      }
    }
  }
  return nodes;
};

const extractSchemaRoot = (doc) => {
  if (!doc || typeof doc !== 'object') return null;
  for (const [key, value] of Object.entries(doc)) {
    if (key === 'schema') return value;
    if (key.endsWith(':schema')) {
      return normalizeSchemaNode(value, key.slice(0, -':schema'.length));
    }
  }
  return null;
};

// Walk all schemas reachable from a WSDL types node
const collectWsdlSchemas = async ({ definitions, uri, resolve }) => {
  const warnings = [];
  const rootPrefixMap = buildPrefixMap(definitions);
  const typesNode = definitions['wsdl:types'] || definitions.types;
  const rootSchemaNodes = typesNode ? extractSchemaNodesFromTypes(typesNode) : [];

  const schemas = rootSchemaNodes.map((node) => ({
    node,
    prefixMap: buildPrefixMap(node, rootPrefixMap),
    uri
  }));

  const resolvedUris = new Set();
  let externalCount = 0;
  const queue = schemas.map((schema) => ({ node: schema.node, uri: schema.uri }));

  while (queue.length) {
    const current = queue.shift();
    const refs = [
      ...getArray(current.node['xsd:import'] || current.node.import).map((node) => ({ node, kind: 'import' })),
      ...getArray(current.node['xsd:include'] || current.node.include).map((node) => ({ node, kind: 'include' }))
    ];

    for (const ref of refs) {
      const schemaLocation = ref.node.schemaLocation;
      if (typeof schemaLocation !== 'string' || !schemaLocation) {
        // schemaLocation is optional on <xsd:import>: the namespace may already be known.
        continue;
      }
      if (!resolve || current.uri == null) {
        warnings.push(`skipped schema ${ref.kind} "${schemaLocation}" — no schema resolver available`);
        continue;
      }
      if (externalCount >= MAX_SCHEMA_DOCUMENTS) {
        warnings.push(`skipped schema ${ref.kind} "${schemaLocation}" — schema document limit (${MAX_SCHEMA_DOCUMENTS}) reached`);
        continue;
      }

      let resolved;
      try {
        resolved = await resolve(current.uri, schemaLocation);
      } catch (err) {
        warnings.push(`could not resolve schema "${schemaLocation}" (referenced from ${current.uri}): ${err.message}`);
        continue;
      }
      if (!resolved || typeof resolved.text !== 'string') {
        warnings.push(`could not resolve schema "${schemaLocation}" (referenced from ${current.uri})`);
        continue;
      }

      const resolvedUri = resolved.uri || schemaLocation;
      if (resolvedUris.has(resolvedUri)) {
        continue;
      }
      resolvedUris.add(resolvedUri);
      externalCount++;

      let schemaNode;
      try {
        const doc = await parseXML(resolved.text);
        schemaNode = extractSchemaRoot(doc);
      } catch (err) {
        warnings.push(`failed to parse schema "${schemaLocation}": ${err.message}`);
        continue;
      }
      if (!schemaNode) {
        warnings.push(`no <schema> root found in "${schemaLocation}"`);
        continue;
      }

      // XSD "chameleon include": an included schema with no targetNamespace adopts the includer's.
      if (ref.kind === 'include' && !schemaNode.targetNamespace && current.node.targetNamespace) {
        schemaNode.targetNamespace = current.node.targetNamespace;
      }

      schemas.push({ node: schemaNode, prefixMap: buildPrefixMap(schemaNode), uri: resolvedUri });
      queue.push({ node: schemaNode, uri: resolvedUri });
    }
  }

  return { schemas, warnings };
};

export { collectWsdlSchemas, buildPrefixMap, resolveQName, extractSchemaNodesFromTypes };

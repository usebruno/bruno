const isPlainObject = require('lodash/isPlainObject');
const { safeDecodeURIComponent } = require('@usebruno/common/utils');

const resolveSpecRef = (spec, ref) => {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) return undefined;
  return ref.slice(2).split('/').reduce((node, part) => {
    const key = safeDecodeURIComponent(part).replace(/~1/g, '/').replace(/~0/g, '~');
    return (isPlainObject(node) || Array.isArray(node)) && Object.hasOwn(node, key) ? node[key] : undefined;
  }, spec);
};

const derefSpecObject = (spec, value) => {
  const seen = new Set();
  let current = value;
  while (isPlainObject(current) && typeof current.$ref === 'string' && !seen.has(current.$ref)) {
    seen.add(current.$ref);
    current = resolveSpecRef(spec, current.$ref);
  }
  return current;
};

const declaredSchemaNode = (spec, schemas) => {
  const flat = [];
  const seen = new Set();
  const visit = (schema) => {
    if (!isPlainObject(schema) || seen.has(schema)) return;
    seen.add(schema);
    if (typeof schema.$ref === 'string') visit(resolveSpecRef(spec, schema.$ref));
    flat.push(schema);
    for (const key of ['allOf', 'oneOf', 'anyOf']) {
      if (Array.isArray(schema[key])) schema[key].forEach(visit);
    }
  };
  schemas.forEach(visit);
  return flat.length > 0 ? { spec, schemas: flat } : undefined;
};

const declaredPropertiesOf = (node) => (node === undefined ? [] : node.schemas.filter((schema) => isPlainObject(schema.properties)).map((schema) => schema.properties));
const declaresIn = (properties, key) => Object.hasOwn(properties, key) && properties[key] !== false;
const declaresKey = (node, key) => declaredPropertiesOf(node).some((properties) => declaresIn(properties, key));
const declaredKeysOf = (node) => declaredPropertiesOf(node).flatMap((properties) => Object.keys(properties).filter((key) => declaresIn(properties, key)));
const declaredChild = (node, key) => node && declaredSchemaNode(node.spec, declaredPropertiesOf(node).filter((properties) => declaresIn(properties, key)).map((properties) => properties[key]));
const declaredItems = (node) => node && declaredSchemaNode(node.spec, node.schemas.flatMap((schema) => [schema.items, ...(Array.isArray(schema.prefixItems) ? schema.prefixItems : [])]));

module.exports = {
  derefSpecObject,
  declaredSchemaNode,
  declaresKey,
  declaredKeysOf,
  declaredChild,
  declaredItems
};

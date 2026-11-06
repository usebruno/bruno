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

const SCALAR_TYPES = ['string', 'number', 'integer', 'boolean'];
const typesOf = (schema) => [].concat(schema.type ?? []);
const isStructure = (value) => isPlainObject(value) || Array.isArray(value);
const allowsStructure = (schema) => !typesOf(schema).every((type) => type === 'null' || SCALAR_TYPES.includes(type))
  || isPlainObject(schema.properties) || schema.items !== undefined || schema.additionalProperties !== undefined
  || isStructure(schema.const) || (Array.isArray(schema.enum) && schema.enum.some(isStructure));
const leavesTypeOpen = (spec, alternative) => {
  const node = declaredSchemaNode(spec, [alternative]);
  return node === undefined || node.schemas.every((schema) => typesOf(schema).length === 0 && schema.const === undefined && schema.enum === undefined);
};
const hasOpenAlternative = (spec, schema) => typesOf(schema).length === 0
  && ['oneOf', 'anyOf'].some((key) => Array.isArray(schema[key]) && schema[key].some((alternative) => leavesTypeOpen(spec, alternative)));
const declaresOnlyScalars = (node) => node !== undefined
  && node.schemas.some((schema) => typesOf(schema).some((type) => SCALAR_TYPES.includes(type)))
  && !node.schemas.some((schema) => allowsStructure(schema) || hasOpenAlternative(node.spec, schema));

const isNullOnly = (schema) => (typesOf(schema).length > 0 && typesOf(schema).every((type) => type === 'null'))
  || (Array.isArray(schema.enum) && schema.enum.length > 0 && schema.enum.every((value) => value === null))
  || (Object.hasOwn(schema, 'const') && schema.const === null);
const alternativesInAncestry = (spec, schema, seen = new Set()) => {
  if (seen.has(schema)) return [];
  seen.add(schema);
  const branches = (key) => (Array.isArray(schema[key]) ? schema[key] : []).map((branch) => derefSpecObject(spec, branch)).filter(isPlainObject);
  return [...branches('oneOf'), ...branches('anyOf'), ...branches('allOf').flatMap((parent) => alternativesInAncestry(spec, parent, seen))];
};
const pinsShape = (spec, schema, seen = new Set()) => {
  if (!isPlainObject(schema) || seen.has(schema)) return false;
  seen.add(schema);
  return typesOf(schema).length > 0 || schema.properties !== undefined || schema.example !== undefined
    || pinsShape(spec, resolveSpecRef(spec, schema.$ref), seen)
    || (Array.isArray(schema.allOf) && schema.allOf.some((part) => pinsShape(spec, part, seen)));
};
const offersChoice = (spec, schema, seen = new Set()) => {
  if (seen.has(schema)) return false;
  seen.add(schema);
  const shapes = alternativesInAncestry(spec, schema).filter((alternative) => !isNullOnly(alternative));
  return shapes.length > 1 || shapes.some((shape) => !pinsShape(spec, shape) && offersChoice(spec, shape, seen));
};
const leavesShapeOpen = (spec, schema) => {
  const own = derefSpecObject(spec, schema);
  return isPlainObject(own) && !pinsShape(spec, schema) && offersChoice(spec, own);
};
const keyLeavesShapeOpen = (node, key) => {
  const schemas = declaredPropertiesOf(node).filter((properties) => declaresIn(properties, key)).map((properties) => properties[key]);
  return schemas.length > 0 && schemas.every((schema) => leavesShapeOpen(node.spec, schema));
};
const itemsLeaveShapeOpen = (node) => {
  const items = node === undefined ? [] : node.schemas.filter((schema) => schema.items !== undefined).map((schema) => schema.items);
  return items.length > 0 && !node.schemas.some((schema) => schema.example !== undefined) && items.every((schema) => leavesShapeOpen(node.spec, schema));
};

const refName = (schema) => (isPlainObject(schema) && typeof schema.$ref === 'string' ? schema.$ref.split('/').pop() : undefined);

const alternativesOf = (node) => node.schemas
  .flatMap((schema) => ['oneOf', 'anyOf'].flatMap((key) => (Array.isArray(schema[key]) ? schema[key] : [])))
  .map((alternative) => ({ name: refName(alternative), node: declaredSchemaNode(node.spec, [alternative]) }))
  .filter((alternative) => alternative.node !== undefined);

const matchesDiscriminator = (alternative, { propertyName, mapping }, value) => {
  const mapped = isPlainObject(mapping) && Object.hasOwn(mapping, value) ? mapping[value] : undefined;
  if (typeof mapped === 'string') return alternative.name === mapped.split('/').pop();
  if (alternative.name === String(value)) return true;
  const property = declaredChild(alternative.node, propertyName);
  return property !== undefined && property.schemas.some((schema) => (Array.isArray(schema.enum) && schema.enum.includes(value)) || schema.const === value);
};

const alternativeWrittenFor = (node, alternatives, value) => {
  const discriminator = node.schemas.map((schema) => schema.discriminator).find((d) => isPlainObject(d) && typeof d.propertyName === 'string');
  if (discriminator !== undefined && Object.hasOwn(value, discriminator.propertyName)) {
    const matched = alternatives.filter((alternative) => matchesDiscriminator(alternative, discriminator, value[discriminator.propertyName]));
    if (matched.length === 1) return matched[0];
  }
  const scores = alternatives.map((alternative) => Object.keys(value).filter((key) => declaresKey(alternative.node, key)).length);
  const best = Math.max(...scores);
  return best > 0 && scores.indexOf(best) === scores.lastIndexOf(best) ? alternatives[scores.indexOf(best)] : undefined;
};

const otherAlternativeKeys = (node, value) => {
  const alternatives = node === undefined ? [] : alternativesOf(node);
  const own = alternatives.length > 1 ? alternativeWrittenFor(node, alternatives, value) : undefined;
  if (own === undefined) return new Set();
  const inAlternatives = new Set(alternatives.flatMap((alternative) => alternative.node.schemas));
  const shared = { spec: node.spec, schemas: node.schemas.filter((schema) => !inAlternatives.has(schema)) };
  return new Set(declaredKeysOf(node).filter((key) => !declaresKey(own.node, key) && !declaresKey(shared, key)));
};

module.exports = {
  derefSpecObject,
  declaredSchemaNode,
  declaresKey,
  declaredKeysOf,
  declaredChild,
  declaredItems,
  declaresOnlyScalars,
  keyLeavesShapeOpen,
  itemsLeaveShapeOpen,
  otherAlternativeKeys
};

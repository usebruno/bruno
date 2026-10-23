import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import uniq from 'lodash/uniq';
import uniqBy from 'lodash/uniqBy';

const COMPOSITION_KEYWORDS = ['allOf', 'oneOf', 'anyOf'];
const CONTENT_KEYWORDS = ['type', 'properties', 'items', 'enum', 'const', 'example', 'default', 'format', 'additionalProperties'];
const TYPE_FALLBACKS = ['string', 'integer', 'boolean', 'object', 'array'];
const STRING_SUBSTITUTES = ['string', 'value', 'example', 'text'];

const createState = () => ({
  flattened: new WeakMap(),
  merges: new WeakMap(),
  lazyMerges: { children: new WeakMap(), merge: null },
  lazyMergeMembers: new WeakMap(),
  constrained: new WeakMap(),
  forbidden: new WeakMap(),
  stripped: new WeakMap(),
  origins: new WeakMap(),
  componentNames: new WeakMap(),
  placeholders: new WeakMap(),
  compositionUse: new WeakMap(),
  inheritedAlternatives: new WeakMap(),
  contributedDiscriminators: new WeakMap(),
  stampedCopies: new WeakMap(),
  stampedOriginals: new WeakMap(),
  exampleCopies: new WeakSet()
});

// Shared across openApiToBruno calls. Safe only because every call runs resetExampleGenerationState first
// and never awaits, so two calls can never mix their caches.
let state = createState();

export const resetSchemaCompositionState = () => {
  state = createState();
};

const isSchemaObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const isExampleCopy = (schema) => isSchemaObject(schema) && state.exampleCopies.has(schema);

const hasKeys = (value) => isSchemaObject(value) && Object.keys(value).length > 0;

const typeSet = (type) => (Array.isArray(type) ? type : [type]).filter((entry) => typeof entry === 'string');

const includesValue = (list, value) => list.some((entry) => isEqual(entry, value));

const allowedValues = (schema) => {
  if (schema.const !== undefined) return [schema.const];
  return Array.isArray(schema.enum) ? schema.enum : null;
};

const hasStructure = (schema) =>
  isSchemaObject(schema) && (hasKeys(schema.properties) || isSchemaObject(schema.items) || isSchemaObject(schema.additionalProperties));

const isMeaningful = (schema) => {
  if (!isSchemaObject(schema) || typeof schema.$ref === 'string') return false;
  const types = typeSet(schema.type);
  if (types.length > 0 && types.every((type) => type === 'null')) return false;
  const values = allowedValues(schema);
  if (values && values.every((value) => value === null)) return false;
  return CONTENT_KEYWORDS.some((keyword) => schema[keyword] !== undefined);
};

const matchesType = (value, type) => {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'integer': return Number.isInteger(value);
    case 'number': return typeof value === 'number';
    case 'boolean': return typeof value === 'boolean';
    case 'null': return value === null;
    case 'array': return Array.isArray(value);
    case 'object': return isSchemaObject(value);
    default: return false;
  }
};

const intersectTypes = (aType, bType) => {
  const a = typeSet(aType);
  const b = typeSet(bType);
  if (a.length === 0) return bType;
  if (b.length === 0) return aType;
  const shared = new Set();
  a.forEach((type) => {
    if (b.includes(type)) shared.add(type);
    else if ((type === 'integer' && b.includes('number')) || (type === 'number' && b.includes('integer'))) shared.add('integer');
  });
  if (shared.size === 0) return undefined;
  return shared.size === 1 ? [...shared][0] : [...shared];
};

const branchesOf = (schema, keyword) =>
  (Array.isArray(schema[keyword]) ? schema[keyword].filter(isSchemaObject).map((branch) => state.placeholders.get(branch) || branch) : []);

const hasBranches = (schema) =>
  isSchemaObject(schema) && (schema.allOf !== undefined || schema.oneOf !== undefined || schema.anyOf !== undefined);

export const registerComponentNames = (schemas) => {
  if (!isSchemaObject(schemas)) return;
  Object.entries(schemas).forEach(([name, schema]) => {
    if (isSchemaObject(schema)) state.componentNames.set(schema, [...(state.componentNames.get(schema) || []), name]);
  });
};

export const registerReferencePlaceholder = (placeholder, target) => {
  if (isSchemaObject(placeholder) && isSchemaObject(target) && placeholder !== target) state.placeholders.set(placeholder, target);
};

export const hasSchemaComposition = (schema) => hasBranches(schema) || (isSchemaObject(schema) && schema.not !== undefined);

export const hasSchemaAlternatives = (schema, seen = new Set()) => {
  if (!isSchemaObject(schema) || seen.has(schema)) return false;
  seen.add(schema);
  if (branchesOf(schema, 'oneOf').length > 0 || branchesOf(schema, 'anyOf').length > 0) return true;
  return branchesOf(schema, 'allOf').some((branch) => hasSchemaAlternatives(branch, seen));
};

export const usesComposition = (schema) => {
  if (!isSchemaObject(schema)) return false;
  if (state.compositionUse.has(schema)) return state.compositionUse.get(schema);
  const seen = new Set();
  const visit = (node) => {
    if (!isSchemaObject(node) || seen.has(node)) return false;
    seen.add(node);
    if (hasSchemaComposition(node)) return true;
    const properties = isSchemaObject(node.properties) ? Object.values(node.properties) : [];
    return [...properties, node.items, node.additionalProperties].some(visit);
  };
  const found = visit(schema);
  state.compositionUse.set(schema, found);
  return found;
};

export const withoutComposition = (schema) => {
  if (!hasSchemaComposition(schema)) return schema;
  if (!state.stripped.has(schema)) state.stripped.set(schema, omit(schema, [...COMPOSITION_KEYWORDS, 'not']));
  return state.stripped.get(schema);
};

export const cycleKeyOf = (schema) => (isSchemaObject(schema) && state.origins.get(schema)) || schema;

const conflicts = (a, b, checked = new Map()) => {
  if (!isSchemaObject(a) || !isSchemaObject(b) || a === b || hasBranches(a) || hasBranches(b)) return false;
  let partners = checked.get(a);
  if (!partners) {
    partners = new Set();
    checked.set(a, partners);
  }
  if (partners.has(b)) return false;
  partners.add(b);

  if (a.type !== undefined && b.type !== undefined && intersectTypes(a.type, b.type) === undefined) return true;
  const aValues = allowedValues(a);
  const bValues = allowedValues(b);
  if (aValues && bValues && !aValues.some((value) => includesValue(bValues, value))) return true;
  if (conflicts(a.items, b.items, checked) || conflicts(a.additionalProperties, b.additionalProperties, checked)) return true;

  const aProps = isSchemaObject(a.properties) ? a.properties : {};
  const bProps = isSchemaObject(b.properties) ? b.properties : {};
  return Object.keys(aProps).some((name) => conflicts(aProps[name], bProps[name], checked));
};

const lazyMerge = (a, b) => {
  const members = [...new Set([...(state.lazyMergeMembers.get(a) || [a]), ...(state.lazyMergeMembers.get(b) || [b])])];
  if (members.length === 1) return members[0];
  let node = state.lazyMerges;
  members.forEach((member) => {
    if (!node.children.has(member)) node.children.set(member, { children: new WeakMap(), merge: null });
    node = node.children.get(member);
  });
  if (!node.merge) {
    node.merge = { allOf: members };
    state.lazyMergeMembers.set(node.merge, members);
  }
  return node.merge;
};

const mergeSubschemas = (a, b) => {
  if (a === false || b === false) return false;
  if (!isSchemaObject(a) || !isSchemaObject(b) || a === b) return b === undefined ? a : b;
  return lazyMerge(a, b);
};

const mergeAdditionalProperties = (a, b) => {
  if (a === false || b === false) return false;
  if (a === true || a === undefined) return b;
  if (b === true || b === undefined) return a;
  return mergeSubschemas(a, b);
};

const moveExamplesToProperties = (a, b, merged) => {
  const contributesFields = (schema) => hasKeys(schema.properties) || isSchemaObject(schema.example);
  const hasObjectExample = isSchemaObject(a.example) || isSchemaObject(b.example);
  if (!hasObjectExample || !contributesFields(a) || !contributesFields(b)) return;

  const properties = { ...(isSchemaObject(merged.properties) ? merged.properties : {}) };
  [b.example, a.example].forEach((example) => {
    if (!isSchemaObject(example)) return;
    Object.entries(example).forEach(([name, value]) => {
      const property = properties[name];
      if (property !== undefined && (!isSchemaObject(property) || property.example !== undefined)) return;
      properties[name] = property === undefined ? { example: value } : { ...property, example: value };
      state.exampleCopies.add(properties[name]);
    });
  });
  merged.properties = properties;
  delete merged.example;
};

const mergeSchemas = (a, b) => {
  if (a === b || !hasKeys(b)) return a;
  if (!hasKeys(a)) return b;
  if (!state.merges.has(a)) state.merges.set(a, new WeakMap());
  const mergesWithA = state.merges.get(a);
  if (mergesWithA.has(b)) return mergesWithA.get(b);

  const merged = omit({ ...a, ...b }, ['$ref']);
  if (a.type !== undefined && b.type !== undefined) {
    const type = intersectTypes(a.type, b.type);
    if (type !== undefined) merged.type = type;
  }
  if (Array.isArray(a.enum) && Array.isArray(b.enum)) {
    const shared = a.enum.filter((value) => includesValue(b.enum, value));
    if (shared.length > 0) merged.enum = shared;
  }
  if (typeof a.minimum === 'number' && typeof b.minimum === 'number') merged.minimum = Math.max(a.minimum, b.minimum);
  if (Array.isArray(a.required) || Array.isArray(b.required)) {
    const required = [...(Array.isArray(a.required) ? a.required : []), ...(Array.isArray(b.required) ? b.required : [])];
    merged.required = [...new Set(required)];
  }
  if (isSchemaObject(a.properties) || isSchemaObject(b.properties)) {
    const properties = { ...(isSchemaObject(a.properties) ? a.properties : {}) };
    Object.entries(isSchemaObject(b.properties) ? b.properties : {}).forEach(([name, schema]) => {
      properties[name] = Object.hasOwn(properties, name) ? mergeSubschemas(properties[name], schema) : schema;
    });
    merged.properties = properties;
  }
  if (a.items !== undefined && b.items !== undefined) merged.items = mergeSubschemas(a.items, b.items);
  if (a.additionalProperties !== undefined || b.additionalProperties !== undefined) {
    merged.additionalProperties = mergeAdditionalProperties(a.additionalProperties, b.additionalProperties);
  }
  if (a.not !== undefined && b.not !== undefined) merged.not = { anyOf: [a.not, b.not] };
  moveExamplesToProperties(a, b, merged);

  mergesWithA.set(b, merged);
  return merged;
};

const mergeAllOf = (branches, context) => {
  let merged = {};
  const parts = [];
  for (const branch of branches) {
    const flattened = flatten(branch, context);
    if (conflicts(merged, flattened)) {
      const flattenedBranches = branches.map((each, index) => (index < parts.length ? parts[index] : index === parts.length ? flattened : flatten(each, context)));
      const fallback = flattenedBranches.find(isMeaningful) || flattenedBranches[0];
      return { merged: fallback, parts: [fallback] };
    }
    merged = mergeSchemas(merged, flattened);
    parts.push(flattened);
  }
  return { merged, parts };
};

const refTail = (value) => String(value).split('/').pop().replace(/~1/g, '/').replace(/~0/g, '~');

const namesOf = (schema, seen = new Set()) => {
  if (!isSchemaObject(schema) || seen.has(schema)) return [];
  seen.add(schema);
  const own = state.componentNames.get(schema);
  if (own) return own;
  const members = branchesOf(schema, 'allOf');
  return members.length === 1 && !hasStructure(omit(schema, COMPOSITION_KEYWORDS)) ? namesOf(members[0], seen) : [];
};

const readDiscriminator = (discriminator) => {
  if (typeof discriminator === 'string' && discriminator) return { propertyName: discriminator, mapping: {} };
  return isSchemaObject(discriminator) && typeof discriminator.propertyName === 'string' && discriminator.propertyName
    ? { propertyName: discriminator.propertyName, mapping: isSchemaObject(discriminator.mapping) ? discriminator.mapping : {} }
    : null;
};

const newWalk = (dedupe) => ({ seen: new Set(), complete: true, found: [], dedupe });

const withAncestryCache = (cache, schema, walk, collect) => {
  if (cache.has(schema)) {
    cache.get(schema).forEach((item) => walk.found.push(item));
    return;
  }
  if (walk.seen.has(schema)) {
    walk.complete = false;
    return;
  }
  walk.seen.add(schema);
  const outerComplete = walk.complete;
  const start = walk.found.length;
  walk.complete = true;
  collect();
  if (walk.complete) cache.set(schema, walk.dedupe(walk.found.slice(start)));
  walk.complete = outerComplete && walk.complete;
};

const firstPerProperty = (discriminators) => uniqBy(discriminators, 'propertyName');

// Classic allOf inheritance labels the child by its own name; oneOf/anyOf parents are left to selectAlternative.
const collectDiscriminators = (parent, walk) => withAncestryCache(state.contributedDiscriminators, parent, walk, () => {
  const discriminator = readDiscriminator(parent.discriminator);
  const hasAlternatives = branchesOf(parent, 'oneOf').length > 0 || branchesOf(parent, 'anyOf').length > 0;
  if (discriminator && hasAlternatives) return;
  if (discriminator) walk.found.push(discriminator);
  branchesOf(parent, 'allOf').forEach((grandparent) => collectDiscriminators(grandparent, walk));
});

const inheritedDiscriminators = (schema) => {
  const walk = newWalk(firstPerProperty);
  branchesOf(schema, 'allOf').forEach((parent) => collectDiscriminators(parent, walk));
  return walk.dedupe(walk.found);
};

const discriminatorValueFor = (schema, discriminator) => {
  const names = namesOf(schema);
  const mapped = Object.keys(discriminator.mapping).find((key) => names.includes(refTail(discriminator.mapping[key])));
  return mapped !== undefined ? mapped : names[0];
};

const selectAlternative = (alternatives, discriminator, context) => {
  const flattened = new Map();
  const flattenedAt = (index) => {
    if (!flattened.has(index)) flattened.set(index, flatten(alternatives[index], context));
    return flattened.get(index);
  };
  const valueFor = (index) => (discriminator ? discriminatorValueFor(alternatives[index], discriminator) : undefined);
  const choose = (index, value) => ({ chosen: flattenedAt(index), value });

  const inProgress = alternatives.reduce((outermost, alternative, index) => (
    context.inProgress.has(alternative)
    && (outermost === -1 || context.inProgress.get(alternative) < context.inProgress.get(alternatives[outermost])) ? index : outermost
  ), -1);
  if (inProgress !== -1) return choose(inProgress, valueFor(inProgress));

  if (discriminator) {
    for (const key of Object.keys(discriminator.mapping)) {
      const target = refTail(discriminator.mapping[key]);
      const index = alternatives.findIndex((alternative) => namesOf(alternative).includes(target));
      if (index !== -1 && isMeaningful(flattenedAt(index))) return choose(index, key);
    }
  }

  const meaningful = alternatives.findIndex((_, index) => isMeaningful(flattenedAt(index)));
  const index = meaningful === -1 ? 0 : meaningful;
  return choose(index, valueFor(index));
};

const stampedCopy = (property, example) => {
  const original = state.stampedOriginals.get(property) || property;
  if (!state.stampedCopies.has(original)) state.stampedCopies.set(original, new Map());
  const copies = state.stampedCopies.get(original);
  if (!copies.has(example)) {
    const copy = { ...original, example };
    copies.set(example, copy);
    state.stampedOriginals.set(copy, original);
  }
  return copies.get(example);
};

const stampDiscriminator = (schema, propertyName, value, context) => {
  const property = isSchemaObject(schema.properties) ? schema.properties[propertyName] : undefined;
  if (value === undefined || !isSchemaObject(property)) return schema;

  const constraint = flatten(property, context);
  const values = isSchemaObject(constraint) ? allowedValues(constraint) : null;
  const stamped = values ? values.find((entry) => String(entry) === String(value)) : value;
  if (stamped === undefined || property.example === stamped) return schema;

  return { ...schema, properties: { ...schema.properties, [propertyName]: stampedCopy(property, stamped) } };
};

const withinAllowedValues = (schema) => {
  const values = allowedValues(schema);
  if (!values) return schema;
  const outside = ['example', 'default'].filter((keyword) => schema[keyword] !== undefined && !includesValue(values, schema[keyword]));
  return outside.length > 0 ? omit(schema, outside) : schema;
};

const recordOrigin = (result, schema, siblings, parts) => {
  const structural = parts.filter(hasStructure);
  const origin = !hasStructure(siblings) && structural.length === 1 ? cycleKeyOf(structural[0]) : schema;
  if (result !== origin && !state.origins.has(result)) state.origins.set(result, origin);
};

const combineBranches = (schema, context) => {
  const discriminator = readDiscriminator(schema.discriminator);
  let { merged, parts } = mergeAllOf(branchesOf(schema, 'allOf'), context);

  let discriminatorValue;
  ['oneOf', 'anyOf'].forEach((keyword) => {
    const alternatives = branchesOf(schema, keyword);
    if (alternatives.length === 0) return;
    const { chosen, value } = selectAlternative(alternatives, discriminator, context);
    merged = mergeSchemas(merged, chosen);
    parts = [...parts, chosen];
    if (value !== undefined) discriminatorValue = value;
  });

  const siblings = omit(schema, COMPOSITION_KEYWORDS);
  let result = mergeSchemas(merged, siblings);
  if (result.const !== undefined) result = { ...result, enum: [result.const] };
  result = withinAllowedValues(result);
  if (schema.example !== undefined && result.example !== schema.example) result = { ...result, example: schema.example };
  const stamped = new Set();
  if (discriminator && discriminatorValue !== undefined) {
    result = stampDiscriminator(result, discriminator.propertyName, discriminatorValue, context);
    stamped.add(discriminator.propertyName);
  }
  if (state.componentNames.has(schema)) {
    inheritedDiscriminators(schema).forEach((inherited) => {
      if (stamped.has(inherited.propertyName)) return;
      result = stampDiscriminator(result, inherited.propertyName, discriminatorValueFor(schema, inherited), context);
      stamped.add(inherited.propertyName);
    });
  }

  recordOrigin(result, schema, siblings, parts);
  return result;
};

const collectAlternatives = (schema, walk) => withAncestryCache(state.inheritedAlternatives, schema, walk, () => {
  walk.found.push(...branchesOf(schema, 'oneOf'), ...branchesOf(schema, 'anyOf'));
  branchesOf(schema, 'allOf').forEach((parent) => collectAlternatives(parent, walk));
});

const isBaseOfSubtypeInProgress = (schema, context) => {
  if (context.inProgress.size === 0) return false;
  const walk = newWalk(uniq);
  collectAlternatives(schema, walk);
  return walk.found.some((alternative) => context.inProgress.has(alternative));
};

const FLATTEN_REBUILD_LIMIT = 2000;

const newContext = () => ({ inProgress: new Map(), cutDepth: Infinity, built: new Set(), rebuilds: 0 });

function flatten(schema, context) {
  if (!hasBranches(schema)) return schema;
  if (state.flattened.has(schema) && !isBaseOfSubtypeInProgress(schema, context)) return state.flattened.get(schema);
  if (context.inProgress.has(schema)) {
    context.cutDepth = Math.min(context.cutDepth, context.inProgress.get(schema));
    return withoutComposition(schema);
  }
  if (context.built.has(schema)) {
    context.rebuilds += 1;
    if (context.rebuilds > FLATTEN_REBUILD_LIMIT) return withoutComposition(schema);
  }
  context.built.add(schema);

  const depth = context.inProgress.size;
  context.inProgress.set(schema, depth);
  const outerCutDepth = context.cutDepth;
  context.cutDepth = Infinity;

  const result = combineBranches(schema, context);

  context.inProgress.delete(schema);
  const dependsOnOuter = context.cutDepth < depth;
  context.cutDepth = dependsOnOuter ? Math.min(outerCutDepth, context.cutDepth) : outerCutDepth;
  if (!dependsOnOuter && context.rebuilds <= FLATTEN_REBUILD_LIMIT) state.flattened.set(schema, result);
  return result;
}

const readForbidden = (schema, seen = new Set()) => {
  const forbidden = { values: [], types: [], required: [] };
  if (!isSchemaObject(schema) || seen.has(schema)) return forbidden;
  seen.add(schema);

  const own = branchesOf(schema, 'allOf').length > 0 ? flatten({ allOf: schema.allOf }, newContext()) : schema;
  const values = allowedValues(own);
  const types = typeSet(own.type);
  if (values) {
    forbidden.values.push(...(types.length > 0 ? values.filter((value) => types.some((type) => matchesType(value, type))) : values));
  } else if (Array.isArray(own.required) && own.required.length > 0) {
    forbidden.required.push(own.required);
  } else if (types.length > 0) {
    forbidden.types.push(...types);
  } else {
    [...branchesOf(schema, 'anyOf'), ...branchesOf(schema, 'oneOf')].forEach((alternative) => {
      const nested = readForbidden(alternative, seen);
      Object.keys(forbidden).forEach((key) => forbidden[key].push(...nested[key]));
    });
  }
  return forbidden;
};

const isForbiddenType = (type, forbiddenTypes) =>
  forbiddenTypes.includes(type) || (type === 'integer' && forbiddenTypes.includes('number'));

const isForbidden = (value, forbidden) =>
  includesValue(forbidden.values, value) || forbidden.types.some((type) => matchesType(value, type));

const filterEnum = (schema, keep) => {
  if (!Array.isArray(schema.enum)) return schema;
  const kept = schema.enum.filter(keep);
  return kept.length > 0 ? { ...schema, enum: kept } : omit(schema, ['enum']);
};

const dropForbiddenCombinations = (schema, groups) => {
  if (groups.length === 0 || !isSchemaObject(schema.properties)) return schema;
  const required = Array.isArray(schema.required) ? schema.required : [];
  let properties = schema.properties;
  groups.forEach((group) => {
    if (!group.every((name) => Object.hasOwn(properties, name))) return;
    const optional = [...group].reverse().find((name) => !required.includes(name));
    if (optional !== undefined) properties = omit(properties, [optional]);
  });
  return properties === schema.properties ? schema : { ...schema, properties };
};

const applyNot = (schema) => {
  const forbidden = readForbidden(schema.not);
  let base = omit(schema, ['not']);

  if (forbidden.values.length > 0) {
    base = filterEnum(base, (value) => !includesValue(forbidden.values, value));
    const removable = ['example', 'default'].filter((keyword) => base[keyword] !== undefined && includesValue(forbidden.values, base[keyword]));
    if (removable.length > 0) base = omit(base, removable);
  }

  if (forbidden.types.length > 0) {
    base = filterEnum(base, (value) => !forbidden.types.some((type) => matchesType(value, type)));
    const ownTypes = typeSet(base.type);
    const remaining = ownTypes.filter((type) => !isForbiddenType(type, forbidden.types));
    if (ownTypes.length > 1 && remaining.length > 0) base = { ...base, type: remaining.length === 1 ? remaining[0] : remaining };
    const unconstrained = base.type === undefined && !hasStructure(base) && base.enum === undefined && base.example === undefined;
    if (unconstrained) {
      const fallback = TYPE_FALLBACKS.find((type) => !isForbiddenType(type, forbidden.types));
      if (fallback) base = { ...base, type: fallback };
    }
  }

  base = dropForbiddenCombinations(base, forbidden.required);
  state.forbidden.set(base, forbidden);
  return base;
};

const substitutesFor = (type, forbidden) => {
  if (type === 'string') return STRING_SUBSTITUTES;
  if (type === 'integer' || type === 'number') return Array.from({ length: forbidden.values.length + 2 }, (_, index) => index + 1);
  if (type === 'boolean') return [true, false];
  if (type === 'null') return [null];
  return [];
};

export const allowedDefault = (schema, generated) => {
  const forbidden = isSchemaObject(schema) ? state.forbidden.get(schema) : undefined;
  if (!forbidden || !isForbidden(generated, forbidden)) return generated;
  const types = typeSet(schema.type);
  const candidates = (types.length > 0 ? types : [typeof generated === 'number' ? 'integer' : typeof generated])
    .flatMap((type) => substitutesFor(type, forbidden));
  const allowed = candidates.find((candidate) => !isForbidden(candidate, forbidden));
  return allowed === undefined ? generated : allowed;
};

export const resolveSchemaComposition = (schema) => {
  if (!hasSchemaComposition(schema)) return schema;
  const flattened = flatten(schema, newContext());
  if (!isSchemaObject(flattened) || flattened.not === undefined) return flattened;

  if (!state.constrained.has(flattened)) {
    const constrained = applyNot(flattened);
    if (!state.origins.has(constrained)) state.origins.set(constrained, cycleKeyOf(flattened));
    state.constrained.set(flattened, constrained);
  }
  return state.constrained.get(flattened);
};

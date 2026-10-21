import isEqual from 'lodash/isEqual';
import minBy from 'lodash/minBy';
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

const isNullOnly = (schema) => {
  const types = typeSet(schema.type);
  const values = allowedValues(schema);
  return (types.length > 0 && types.every((type) => type === 'null')) || Boolean(values && values.every((value) => value === null));
};

const isMeaningful = (schema) => {
  if (!isSchemaObject(schema) || typeof schema.$ref === 'string' || isNullOnly(schema)) return false;
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

export const registerComponentNames = (schemas, rawSchemas) => {
  if (!isSchemaObject(schemas)) return;
  const isAlias = ([name]) => isSchemaObject(rawSchemas) && isSchemaObject(rawSchemas[name]) && typeof rawSchemas[name].$ref === 'string';
  const entries = Object.entries(schemas);
  [...entries.filter((entry) => !isAlias(entry)), ...entries.filter(isAlias)].forEach(([name, schema]) => {
    if (isSchemaObject(schema)) state.componentNames.set(schema, [...(state.componentNames.get(schema) || []), name]);
  });
};

export const registerReferencePlaceholder = (placeholder, target) => {
  if (isSchemaObject(placeholder) && isSchemaObject(target) && placeholder !== target) state.placeholders.set(placeholder, target);
};

export const hasSchemaComposition = (schema) => hasBranches(schema) || (isSchemaObject(schema) && schema.not !== undefined);

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
  const parts = branches.map((branch) => flatten(branch, context));
  let merged = {};
  for (const part of parts) {
    if (conflicts(merged, part)) {
      const fallback = parts.find(isMeaningful) || parts[0];
      return { merged: fallback, parts: [fallback] };
    }
    merged = mergeSchemas(merged, part);
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

const newWalk = (dedupe) => ({ seen: new Set(), cuts: 0, found: [], dedupe });

const withAncestryCache = (cache, schema, walk, collect) => {
  if (cache.has(schema)) {
    cache.get(schema).forEach((item) => walk.found.push(item));
    return;
  }
  if (walk.seen.has(schema)) {
    walk.cuts += 1;
    return;
  }
  walk.seen.add(schema);
  const cuts = walk.cuts;
  const start = walk.found.length;
  collect();
  if (walk.cuts === cuts) cache.set(schema, walk.dedupe(walk.found.slice(start)));
};

const firstPerProperty = (discriminators) => uniqBy(discriminators, 'propertyName');

// Classic allOf inheritance labels the child by its own name; oneOf/anyOf parents are left to selectAlternative.
const collectDiscriminators = (parent, walk) => withAncestryCache(state.contributedDiscriminators, parent, walk, () => {
  const discriminator = readDiscriminator(parent.discriminator);
  const hasAlternatives = branchesOf(parent, 'oneOf').length > 0 || branchesOf(parent, 'anyOf').length > 0;
  if (discriminator && !hasAlternatives) walk.found.push(discriminator);
  const start = walk.found.length;
  branchesOf(parent, 'allOf').forEach((grandparent) => collectDiscriminators(grandparent, walk));
  if (discriminator && hasAlternatives) walk.found.push(...walk.found.splice(start).filter((each) => each.propertyName !== discriminator.propertyName));
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
  const usable = (index) => isMeaningful(flattenedAt(index)) && !isRuledOut(flattenedAt(index), context);

  const inProgress = alternatives.indexOf(minBy(alternatives, (alternative) => context.inProgress.get(alternative)));
  if (inProgress !== -1) return choose(inProgress, valueFor(inProgress));

  if (discriminator) {
    for (const key of Object.keys(discriminator.mapping)) {
      const target = refTail(discriminator.mapping[key]);
      const index = alternatives.findIndex((alternative) => namesOf(alternative).includes(target));
      if (index !== -1 && usable(index)) return choose(index, key);
    }
  }

  const allowed = alternatives.findIndex((_, index) => usable(index));
  const meaningful = allowed !== -1 ? allowed : alternatives.findIndex((_, index) => isMeaningful(flattenedAt(index)));
  const index = meaningful === -1 ? 0 : meaningful;
  return choose(index, valueFor(index));
};

const stampedCopy = (property, example) => {
  if (!state.stampedCopies.has(property)) state.stampedCopies.set(property, new Map());
  const copies = state.stampedCopies.get(property);
  if (!copies.has(example)) {
    const copy = { ...property, example };
    copies.set(example, copy);
    state.stampedCopies.set(copy, copies);
  }
  return copies.get(example);
};

const valueOfType = (value, types) => {
  if (types.length === 0 || types.includes('string')) return value;
  const number = value === '' ? NaN : Number(value);
  if (types.includes('integer') && Number.isInteger(number)) return number;
  if (types.includes('number') && Number.isFinite(number)) return number;
  if (types.includes('boolean') && (value === 'true' || value === 'false')) return value === 'true';
  return undefined;
};

const stampDiscriminator = (schema, propertyName, value, context) => {
  const property = isSchemaObject(schema.properties) ? schema.properties[propertyName] : undefined;
  if (value === undefined || !isSchemaObject(property)) return schema;

  const constraint = flatten(property, context);
  const values = isSchemaObject(constraint) ? allowedValues(constraint) : null;
  const stamped = values ? values.find((entry) => String(entry) === String(value)) : valueOfType(value, isSchemaObject(constraint) ? typeSet(constraint.type) : []);
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
  const forbidden = schema.not === undefined ? null : readForbidden(schema.not);
  if (forbidden) context.forbidden.push(forbidden);
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
  if (forbidden) context.forbidden.pop();

  const siblings = omit(schema, COMPOSITION_KEYWORDS);
  let result = mergeSchemas(merged, siblings);
  if (result.const !== undefined) result = { ...result, enum: [result.const] };
  result = withinAllowedValues(result);
  if (schema.example !== undefined && result.example !== schema.example) result = { ...result, example: schema.example };
  if (discriminatorValue !== undefined) result = stampDiscriminator(result, discriminator.propertyName, discriminatorValue, context);
  if (state.componentNames.has(schema)) {
    inheritedDiscriminators(schema).forEach((inherited) => {
      if (discriminatorValue !== undefined && inherited.propertyName === discriminator.propertyName) return;
      result = stampDiscriminator(result, inherited.propertyName, discriminatorValueFor(schema, inherited), context);
    });
  }

  recordOrigin(result, schema, siblings, parts);
  return result;
};

const collectAlternatives = (schema, walk) => withAncestryCache(state.inheritedAlternatives, schema, walk, () => {
  walk.found.push(...branchesOf(schema, 'oneOf'), ...branchesOf(schema, 'anyOf'));
  branchesOf(schema, 'allOf').forEach((parent) => collectAlternatives(parent, walk));
});

const alternativesInAncestry = (schema) => {
  const walk = newWalk(uniq);
  collectAlternatives(schema, walk);
  return walk.found;
};

export const hasSchemaAlternatives = (schema) => {
  const seen = new Set();
  const offersChoice = (current) => {
    if (seen.has(current)) return false;
    seen.add(current);
    const shapes = alternativesInAncestry(current).filter((alternative) => !isNullOnly(alternative));
    return shapes.length > 1 || shapes.some(offersChoice);
  };
  return isSchemaObject(schema) && offersChoice(schema);
};

const isBaseOfSubtypeInProgress = (schema, context) =>
  context.inProgress.size > 0 && alternativesInAncestry(schema).some((alternative) => context.inProgress.has(alternative));

const FLATTEN_REBUILD_LIMIT = 2000;

const newContext = () => ({ inProgress: new Map(), cutDepth: Infinity, built: new Set(), rebuilds: 0, forbidden: [] });

function flatten(schema, context) {
  if (!hasBranches(schema)) return schema;
  const constrained = context.forbidden.length > 0 && alternativesInAncestry(schema).length > 0;
  if (!constrained && state.flattened.has(schema) && !isBaseOfSubtypeInProgress(schema, context)) return state.flattened.get(schema);
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
  if (!constrained && !dependsOnOuter && (depth === 0 || context.rebuilds <= FLATTEN_REBUILD_LIMIT)) state.flattened.set(schema, result);
  return result;
}

function readForbidden(schema, seen = new Set()) {
  const forbidden = { values: [], types: [], required: [] };
  if (!isSchemaObject(schema) || seen.has(schema)) return forbidden;
  seen.add(schema);

  const own = branchesOf(schema, 'allOf').length > 0 ? flatten(omit(schema, ['oneOf', 'anyOf']), newContext()) : schema;
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
}

const isForbiddenType = (type, forbiddenTypes) =>
  forbiddenTypes.includes(type) || (type === 'integer' && forbiddenTypes.includes('number'));

const isForbidden = (value, forbidden) =>
  includesValue(forbidden.values, value) || forbidden.types.some((type) => matchesType(value, type));

const violatesNot = (value, forbidden) =>
  isForbidden(value, forbidden) || (isSchemaObject(value) && forbidden.required.some((group) => group.every((name) => Object.hasOwn(value, name))));

function isRuledOut(schema, context) {
  const values = allowedValues(schema);
  const types = typeSet(schema.type);
  return context.forbidden.some((forbidden) => {
    if (values) return values.every((value) => isForbidden(value, forbidden));
    if (types.length > 0 && types.every((type) => isForbiddenType(type, forbidden.types))) return true;
    return Array.isArray(schema.required) && forbidden.required.some((group) => group.every((name) => schema.required.includes(name)));
  });
}

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
  const removable = ['example', 'default'].filter((keyword) => schema[keyword] !== undefined && violatesNot(schema[keyword], forbidden));
  let base = omit(schema, ['not', ...removable]);
  if (Array.isArray(base.examples)) {
    const examples = base.examples.filter((value) => !violatesNot(value, forbidden));
    if (examples.length < base.examples.length) base = examples.length > 0 ? { ...base, examples } : omit(base, ['examples']);
  }
  if (forbidden.values.length > 0 || forbidden.types.length > 0) base = filterEnum(base, (value) => !isForbidden(value, forbidden));

  if (forbidden.types.length > 0) {
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
  state.origins.set(base, cycleKeyOf(schema));
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
  const forbidden = state.forbidden.get(schema);
  if (!forbidden || !isForbidden(generated, forbidden)) return generated;
  const types = typeSet(schema.type);
  const allowed = (types.length > 0 ? types : [typeof generated])
    .flatMap((type) => substitutesFor(type, forbidden))
    .find((candidate) => !isForbidden(candidate, forbidden));
  return allowed === undefined ? generated : allowed;
};

export const resolveSchemaComposition = (schema) => {
  if (!hasSchemaComposition(schema)) return schema;
  const flattened = flatten(schema, newContext());
  if (flattened.not === undefined) return flattened;
  if (!state.constrained.has(flattened)) state.constrained.set(flattened, applyNot(flattened));
  return state.constrained.get(flattened);
};

import { Validator } from 'jsonschema';
import { findNodeAtLocation, getLocation, parse, parseTree } from 'jsonc-parser';

const CodeMirror = require('codemirror');
const validator = new Validator();

const maskBrunoVariables = (text) => text.replace(/(?<!["\w])\{\{[^{}]+}}/g, (match) => `0${' '.repeat(match.length - 1)}`);
const isBareBrunoVariable = (text) => /^\s*\{\{[^{}]+}}\s*$/.test(text);

const schemaAlternatives = (schema) => [schema, ...(schema?.oneOf || []), ...(schema?.anyOf || [])].filter(Boolean);

const schemaAtPath = (rootSchema, path) => path.reduce((schema, segment) => {
  const candidates = schemaAlternatives(schema);
  if (typeof segment === 'number') {
    return candidates.map((candidate) => candidate.items).find(Boolean) || {};
  }
  return candidates.map((candidate) => candidate.properties?.[segment]).find(Boolean) || {};
}, rootSchema || {});

const propertySchemas = (schema) => schemaAlternatives(schema).reduce((result, candidate) => ({
  ...result,
  ...(candidate.properties || {})
}), {});

const requiredProperties = (schema) => new Set(
  schemaAlternatives(schema).flatMap((candidate) => candidate.required || [])
);

const exampleValue = (schema) => {
  if (schema?.example !== undefined) return schema.example;
  if (schema?.default !== undefined) return schema.default;
  if (schema?.enum?.length) return schema.enum[0];
  const type = Array.isArray(schema?.type) ? schema.type.find((entry) => entry !== 'null') : schema?.type;
  if (type === 'object' || schema?.properties) return {};
  if (type === 'array') return [];
  if (type === 'boolean') return false;
  if (type === 'integer' || type === 'number') return 0;
  return '';
};

const usedPropertyNames = (text, path) => {
  const root = parseTree(maskBrunoVariables(text));
  const objectNode = root && findNodeAtLocation(root, path);
  if (!objectNode || objectNode.type !== 'object') return new Set();
  return new Set((objectNode.children || []).map((property) => property.children?.[0]?.value).filter(Boolean));
};

const replacementRange = (cm) => {
  const cursor = cm.getCursor();
  const token = cm.getTokenAt(cursor);
  const quotedProperty = token.type === 'property' || (token.type === 'string' && token.string.startsWith('"'));
  return {
    from: quotedProperty ? CodeMirror.Pos(cursor.line, token.start) : cursor,
    to: quotedProperty ? CodeMirror.Pos(cursor.line, token.end) : cursor
  };
};

export const getJsonSchemaHints = (cm, schema) => {
  if (!schema) return null;
  const text = cm.getValue();
  const cursor = cm.getCursor();
  const offset = cm.indexFromPos(cursor);
  const location = getLocation(maskBrunoVariables(text), offset);
  if (!location.isAtPropertyKey) return null;

  const parentPath = location.path.slice(0, -1);
  const parentSchema = schemaAtPath(schema, parentPath);
  const properties = propertySchemas(parentSchema);
  const required = requiredProperties(parentSchema);
  const used = usedPropertyNames(text, parentPath);
  const currentProperty = location.path[location.path.length - 1];
  // Keep a complete schema property in the used set so it is not suggested
  // again. Remove only an incomplete key, allowing prefix completion such as
  // `"co"` -> `"cost"`.
  if (currentProperty && !Object.hasOwn(properties, currentProperty)) used.delete(currentProperty);
  const prefix = typeof currentProperty === 'string' ? currentProperty.toLowerCase() : '';
  const range = replacementRange(cm);
  const list = Object.entries(properties)
    .filter(([name]) => !used.has(name) && (!prefix || name.toLowerCase().startsWith(prefix)))
    .map(([name, propertySchema]) => ({
      text: `${JSON.stringify(name)}: ${JSON.stringify(exampleValue(propertySchema), null, 2)}`,
      displayText: `${name}${required.has(name) ? ' (required)' : ''}`,
      className: required.has(name) ? 'json-schema-required' : 'json-schema-optional'
    }));

  return list.length ? { list, ...range } : null;
};

export const showJsonSchemaHints = (cm, schema) => {
  const hints = getJsonSchemaHints(cm, schema);
  if (!hints) return false;
  cm.showHint({ hint: () => hints, completeSingle: false });
  return true;
};

export const setupJsonSchemaAutocomplete = (cm, getSchema) => {
  const onInputRead = (editor, change) => {
    if (!getSchema?.() || !/[A-Za-z0-9_{"',]/.test(change.text?.join('') || '')) return;
    showJsonSchemaHints(editor, getSchema());
  };
  cm.on('inputRead', onInputRead);
  return () => cm.off('inputRead', onInputRead);
};

export const getJsonSchemaLintErrors = (text, schema, cm) => {
  if (!schema || !cm) return [];
  const maskedText = maskBrunoVariables(text);
  const parseErrors = [];
  const data = parse(maskedText, parseErrors, { allowTrailingComma: true });
  if (parseErrors.length) return [];

  const root = parseTree(maskedText);
  let validationErrors;
  try {
    validationErrors = validator.validate(data, schema).errors;
  } catch (error) {
    return [{
      from: CodeMirror.Pos(0, 0),
      to: CodeMirror.Pos(0, 0),
      severity: 'error',
      message: `OpenAPI: ${error.message || 'The request body schema could not be resolved'}`
    }];
  }

  return validationErrors.flatMap((error) => {
    const path = Array.isArray(error.path) ? error.path : [];
    const node = root && (findNodeAtLocation(root, path) || root);
    if (node && isBareBrunoVariable(text.slice(node.offset, node.offset + node.length))) return [];
    const from = node ? cm.posFromIndex(node.offset) : CodeMirror.Pos(0, 0);
    const to = node ? cm.posFromIndex(node.offset + Math.max(node.length, 1)) : from;
    return [{
      from,
      to,
      severity: 'error',
      message: `OpenAPI: ${error.stack || error.message}`
    }];
  });
};

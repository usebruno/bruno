import get from 'lodash/get';
import { interpolate, mockDataFunctions } from '@usebruno/common';
import {
  getDataTypeFromValue,
  parseValueByDataType,
  resolveEnvironmentInheritance,
  toDisplayString
} from '@usebruno/common/utils';
import {
  findEnvironmentInCollection,
  getAllVariables,
  getAuthContentKey,
  getEffectiveActiveEnvironmentUid,
  getFormattedCollectionOauth2Credentials,
  getTreePathFromCollectionToItem,
  isItemAFolder,
  mergeHeaders,
  readItemRequestVars
} from 'utils/collections';
import { resolveInheritedAuth } from 'utils/auth';
import { extractSensitiveVarNames } from 'utils/sensitive-fields';
import { EDITABLE_SCOPES, SCOPE_TITLES, SCOPES, VARIABLE_REFERENCE_PATTERN } from './constants';

export const isObjectOrArray = (value) => getDataTypeFromValue(value) === 'object';

export const holdsVariableReference = (value) => typeof value === 'string' && VARIABLE_REFERENCE_PATTERN.test(value);

/** Serialize for the value editor JSON so CodeMirror can color tokens. */
export const valueToEditorText = (value) => {
  if (value === undefined) return '';
  if (isObjectOrArray(value)) return toDisplayString(value, '');
  if (holdsVariableReference(value)) return value;
  return JSON.stringify(value) ?? '';
};

export const isInsideFloatingMenu = (target) => !!target?.closest?.('[data-tippy-root]');

export const focusAtEnd = (editor) => {
  if (!editor) return;
  editor.focus();
  editor.setCursor(editor.lineCount(), 0);
};

export const secretRevealKey = (section, name) => `${section.key}:${section.owner?.uid ?? ''}:${name}`;

const storedVariableRow = (variable, extra = {}) => ({
  uid: variable.uid,
  name: variable.name,
  reference: variable.name,
  value: parseValueByDataType(variable.value, variable.dataType),
  rawValue: variable.value,
  dataType: variable.dataType || 'string',
  secret: !!variable.secret,
  variable,
  ...extra
});

const enabledRows = (variables, extra) => (variables || [])
  .filter((variable) => variable.enabled)
  .map((variable) => storedVariableRow(variable, extra));

const mapRows = (prefix, values, { secret, referencePrefix = '' }) => Object.entries(values || {})
  .map(([name, value]) => ({
    uid: `${prefix}::${name}`,
    name,
    reference: `${referencePrefix}${name}`,
    value,
    rawValue: value,
    dataType: getDataTypeFromValue(value),
    secret
  }));

const winningVariables = (variables) => {
  const winners = new Map();
  variables.filter((variable) => variable.enabled).forEach((variable) => {
    const current = winners.get(variable.name);
    if (!current || variable.secret || !current.secret) winners.set(variable.name, variable);
  });
  return variables.filter((variable) => winners.get(variable.name) === variable);
};

const environmentRows = (environments, environment) => {
  const { variables } = resolveEnvironmentInheritance({ environments, targetEnvironment: environment, merge: true });
  return enabledRows(winningVariables(variables))
    .map((row) => (row.variable.inheritedFrom ? { ...row, readOnly: true } : row));
};

const section = (scope, rows, extra = {}) => ({
  key: scope,
  scope,
  title: SCOPE_TITLES[scope],
  editable: EDITABLE_SCOPES.includes(scope),
  rows,
  ...extra
});

/**
 * Every variable the request can resolve, grouped by scope from highest to lowest
 * precedence.
 */
export const getSidebarSections = ({ collection, item, globalEnvironments, activeGlobalEnvironmentUid }) => {
  const folders = item
    ? getTreePathFromCollectionToItem(collection, item).filter(isItemAFolder).reverse()
    : [];
  const activeEnvironment = findEnvironmentInCollection(collection, getEffectiveActiveEnvironmentUid(collection));
  const activeGlobalEnvironment = (globalEnvironments || []).find((env) => env.uid === activeGlobalEnvironmentUid);
  const request = item ? (item.draft?.request ?? item.request) : null;

  const sections = [
    section(SCOPES.RUNTIME, mapRows('runtime', collection.runtimeVariables, { secret: false })),
    section(
      SCOPES.OAUTH2,
      mapRows('oauth2', getFormattedCollectionOauth2Credentials({ oauth2Credentials: collection.oauth2Credentials }), { secret: true })
    ),
    ...(item
      ? [section(SCOPES.REQUEST, [
          ...enabledRows(readItemRequestVars(item)),
          ...enabledRows(get(request, 'vars.res'), { readOnly: true, postResponse: true })
        ], { owner: item })]
      : []),
    ...folders.map((folder) => section(SCOPES.FOLDER, enabledRows(readItemRequestVars(folder)), {
      key: `${SCOPES.FOLDER}:${folder.uid}`,
      owner: folder,
      pill: { label: folder.name }
    })),
    ...(activeEnvironment
      ? [section(SCOPES.ENVIRONMENT, environmentRows(collection.environments, activeEnvironment), {
          owner: activeEnvironment,
          pill: { label: activeEnvironment.name, color: activeEnvironment.color }
        })]
      : []),
    section(SCOPES.COLLECTION, enabledRows(readItemRequestVars(collection.draft?.root || collection.root))),
    ...(activeGlobalEnvironment
      ? [section(SCOPES.GLOBAL, environmentRows(globalEnvironments, activeGlobalEnvironment), {
          owner: activeGlobalEnvironment,
          pill: { label: activeGlobalEnvironment.name, color: activeGlobalEnvironment.color }
        })]
      : []),
    section(
      SCOPES.PROCESS_ENV,
      mapRows('process-env', { ...collection.workspaceProcessEnvVariables, ...collection.processEnvVariables }, {
        secret: true,
        referencePrefix: 'process.env.'
      })
    )
  ];

  return sections.filter((entry) => entry.rows.length > 0);
};

const SKIPPED_REFERENCE_KEYS = new Set(['uid', 'description', 'enabled', 'type', 'contentType']);

const addReference = (found, name, location) => {
  const locations = found.get(name) || [];
  if (!locations.includes(location)) locations.push(location);
  found.set(name, locations);
};

const collectReferences = (value, location, found) => {
  if (typeof value === 'string') {
    extractSensitiveVarNames(value)
      .filter((name) => !name.startsWith('?'))
      .forEach((name) => addReference(found, name, location));
    return;
  }
  if (Array.isArray(value)) {
    value
      .filter((entry) => entry?.enabled !== false)
      .forEach((entry) => collectReferences(entry, location, found));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value)
      .filter(([key]) => !SKIPPED_REFERENCE_KEYS.has(key))
      .forEach(([, entry]) => collectReferences(entry, location, found));
  }
};

const collectDefinedNames = (variables, location, found) => {
  (variables || [])
    .filter((variable) => variable.enabled && variable.name)
    .forEach((variable) => addReference(found, variable.name, location));
};

export const getRequestReferences = (collection, item) => {
  const request = item.draft?.request ?? item.request ?? {};
  const headers = mergeHeaders(collection, request, getTreePathFromCollectionToItem(collection, item));
  const { auth } = resolveInheritedAuth(item, collection);
  const found = new Map();

  collectReferences(request.url, 'URL', found);
  collectReferences(request.params, 'Params', found);
  collectReferences(headers, 'Headers', found);
  collectReferences(request.body?.[request.body?.mode], 'Body', found);
  collectReferences(auth?.[getAuthContentKey(auth?.mode)], 'Auth', found);
  collectReferences(request.assertions, 'Assertions', found);
  collectDefinedNames(request.vars?.req, 'Pre Request Vars', found);
  collectReferences(request.vars?.req, 'Pre Request Vars', found);
  collectDefinedNames(request.vars?.res, 'Post Response Vars', found);
  collectReferences(request.vars?.res, 'Post Response Vars', found);

  return found;
};

const isDynamicVariable = (name) => name.startsWith('$') && !name.startsWith('$oauth2.') && !!mockDataFunctions[name.slice(1)];

const findRow = (sections, isMatch) => {
  for (const entry of sections) {
    const matches = entry.rows.filter(isMatch);
    const row = matches.findLast((candidate) => !candidate.readOnly) ?? matches[0];
    if (row) return { section: entry, row };
  }
  return null;
};

const findWinningRow = (sections, name) => (
  findRow(sections, (candidate) => candidate.reference === name && !candidate.postResponse)
  ?? findRow(sections, (candidate) => candidate.reference === name)
);

/**
 * The variables a request references, each placed in the scope its value resolves from.
 * Nested `{{references}}` inside a used value count as used too. Anything that resolves
 * nowhere lands in a leading "Not defined" section.
 */
export const getUsedSections = ({ collection, item, sections }) => {
  const allVariables = getAllVariables(collection, item);
  const usedRowsBySection = new Map();
  const undefinedRows = [];
  const usedRowsByName = new Map();

  const addUsed = (name, locations, ancestors) => {
    if (usedRowsByName.has(name)) return usedRowsByName.get(name);
    if (isDynamicVariable(name)) return null;
    usedRowsByName.set(name, null);

    const match = findWinningRow(sections, name);
    if (!match) {
      undefinedRows.push({ uid: `undefined::${name}`, name, reference: name, locations, value: undefined, rawValue: '', secret: false });
      return null;
    }

    const usedRow = {
      ...match.row,
      locations,
      value: typeof match.row.value === 'string' && holdsVariableReference(match.row.value)
        ? interpolate(match.row.value, allVariables)
        : match.row.value
    };
    const rows = usedRowsBySection.get(match.section.key) || [];
    rows.push(usedRow);
    usedRowsBySection.set(match.section.key, rows);
    usedRowsByName.set(name, usedRow);

    if (typeof match.row.rawValue === 'string' && !ancestors.includes(name)) {
      extractSensitiveVarNames(match.row.rawValue).forEach((childName) => {
        const childRow = addUsed(childName, [`Used by ${name}`], [...ancestors, name]);
        if (childRow?.secret) usedRow.secret = true;
      });
    }
    return usedRow;
  };

  getRequestReferences(collection, item).forEach((locations, name) => addUsed(name, locations, []));

  const used = sections
    .filter((entry) => usedRowsBySection.has(entry.key))
    .map((entry) => ({ ...entry, rows: usedRowsBySection.get(entry.key) }));

  return undefinedRows.length
    ? [section(SCOPES.UNDEFINED, undefinedRows, { editable: false }), ...used]
    : used;
};

export const countRows = (sections) => sections.reduce((count, entry) => count + entry.rows.length, 0);

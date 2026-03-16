import {
  isScalarType,
  isEnumType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isInputObjectType,
  isNonNullType,
  isListType,
  getNamedType,
  parse as gqlParse,
  print,
  Kind
} from 'graphql';

const MAX_DEPTH = 7;

const PLACEHOLDER = '__bruno_placeholder__';

const sanitizeQueryForParsing = (queryString) => {
  let sanitized = queryString.replace(/\(\s*\)/g, '');
  sanitized = sanitized.replace(/(:\s*)\{\s*\}/g, '$1{ __empty: true }');
  sanitized = sanitized.replace(/\{\s*\}/g, `{ ${PLACEHOLDER} }`);
  return sanitized;
};

const resolveRootType = (schema, rootTypeName) => {
  switch (rootTypeName) {
    case 'Query': return schema.getQueryType();
    case 'Mutation': return schema.getMutationType();
    case 'Subscription': return schema.getSubscriptionType();
    default: return null;
  }
};

const getTypeLabel = (type) => {
  if (isNonNullType(type)) return `${getTypeLabel(type.ofType)}!`;
  if (isListType(type)) return `[${getTypeLabel(type.ofType)}]`;
  return type.name;
};

const isLeafType = (type) => {
  const named = getNamedType(type);
  return isScalarType(named) || isEnumType(named);
};

const containsListType = (type) => {
  if (isListType(type)) return true;
  if (isNonNullType(type)) return containsListType(type.ofType);
  return false;
};

const typeToAST = (type) => {
  if (isNonNullType(type)) {
    return { kind: Kind.NON_NULL_TYPE, type: typeToAST(type.ofType) };
  }
  if (isListType(type)) {
    return { kind: Kind.LIST_TYPE, type: typeToAST(type.ofType) };
  }
  return { kind: Kind.NAMED_TYPE, name: { kind: Kind.NAME, value: type.name } };
};

const buildTypeDescriptor = (field) => {
  const named = getNamedType(field.type);
  return {
    name: field.name,
    type: field.type,
    namedType: named,
    typeLabel: getTypeLabel(field.type),
    description: field.description || null,
    isRequired: isNonNullType(field.type),
    isEnum: isEnumType(named),
    enumValues: isEnumType(named) ? named.getValues().map((v) => v.value) : null,
    isBoolean: named?.name === 'Boolean',
    isInputObject: isInputObjectType(named),
    isList: containsListType(field.type)
  };
};

const buildFieldDescriptor = (field, parentPath) => {
  const named = getNamedType(field.type);
  const path = parentPath ? `${parentPath}.${field.name}` : field.name;

  return {
    name: field.name,
    path,
    type: field.type,
    namedType: named,
    typeLabel: getTypeLabel(field.type),
    isLeaf: isLeafType(field.type),
    isDeprecated: field.isDeprecated || false,
    deprecationReason: field.deprecationReason || null,
    description: field.description || null,
    args: (field.args || []).map((arg) => ({
      ...buildTypeDescriptor(arg),
      defaultValue: arg.defaultValue
    }))
  };
};

export const getFieldChildren = (namedType, parentPath) => {
  if (!namedType) {
    return { fields: [] };
  }

  if (isObjectType(namedType) || isInterfaceType(namedType)) {
    const fieldMap = namedType.getFields();
    const fields = Object.values(fieldMap).map((field) => buildFieldDescriptor(field, parentPath));
    return { fields };
  }

  if (isUnionType(namedType)) {
    const types = namedType.getTypes();
    const unionTypes = types.map((type) => ({
      name: type.name,
      path: `${parentPath}.__on_${type.name}`,
      type,
      namedType: type,
      isUnionMember: true
    }));
    return { fields: [], unionTypes };
  }

  return { fields: [] };
};

export const getInputObjectFields = (namedType) => {
  if (!namedType || !isInputObjectType(namedType)) return [];
  const fieldMap = namedType.getFields();
  return Object.values(fieldMap).map(buildTypeDescriptor);
};

export const getRootFields = (schema, rootTypeName) => {
  if (!schema) return [];
  const rootType = resolveRootType(schema, rootTypeName);
  if (!rootType) return [];
  const fieldMap = rootType.getFields();
  return Object.values(fieldMap).map((field) => buildFieldDescriptor(field, rootTypeName));
};

export const getAvailableRootTypes = (schema) => {
  if (!schema) return [];
  const types = [];
  if (schema.getQueryType()) types.push('Query');
  if (schema.getMutationType()) types.push('Mutation');
  if (schema.getSubscriptionType()) types.push('Subscription');
  return types;
};

const collectVariablesForInputObject = (parentKey, inputType, enabledArgs, varMap, usedNames) => {
  if (!inputType || !isInputObjectType(inputType)) return;
  const fieldMap = inputType.getFields();

  for (const [fieldName, field] of Object.entries(fieldMap)) {
    const fieldKey = `${parentKey}.${fieldName}`;
    if (!enabledArgs.has(fieldKey)) continue;

    const named = getNamedType(field.type);
    if (isInputObjectType(named)) {
      collectVariablesForInputObject(fieldKey, named, enabledArgs, varMap, usedNames);
    } else {
      let varName = fieldName;
      if (usedNames.has(varName)) {
        const parts = parentKey.split('.');
        varName = `${parts[parts.length - 1]}_${fieldName}`;
        let i = 2;
        while (usedNames.has(varName)) {
          varName = `${fieldName}_${i}`;
          i++;
        }
      }
      usedNames.add(varName);
      varMap.set(fieldKey, { varName, type: field.type });
    }
  }
};

const collectVariablesFromSelections = (selections, enabledArgs, type, parentPath, visited, depth, varMap, usedNames) => {
  if (!type || depth > MAX_DEPTH || visited.has(type.name)) return;

  const nextVisited = new Set(visited);
  nextVisited.add(type.name);

  if (isUnionType(type)) {
    for (const memberType of type.getTypes()) {
      const memberPath = `${parentPath}.__on_${memberType.name}`;
      let isMemberSelected = selections.has(memberPath);
      if (!isMemberSelected) {
        for (const s of selections) {
          if (s.startsWith(memberPath + '.')) {
            isMemberSelected = true;
            break;
          }
        }
      }
      if (!isMemberSelected) continue;
      collectVariablesFromSelections(selections, enabledArgs, memberType, memberPath, nextVisited, depth + 1, varMap, usedNames);
    }
    return;
  }

  if (!isObjectType(type) && !isInterfaceType(type)) return;

  const fieldMap = type.getFields();
  for (const [fieldName, field] of Object.entries(fieldMap)) {
    const fieldPath = `${parentPath}.${fieldName}`;
    if (!selections.has(fieldPath)) continue;

    if (field.args) {
      for (const arg of field.args) {
        const argKey = `${fieldPath}.${arg.name}`;
        if (!enabledArgs || !enabledArgs.has(argKey)) continue;

        const named = getNamedType(arg.type);
        if (isInputObjectType(named)) {
          collectVariablesForInputObject(argKey, named, enabledArgs, varMap, usedNames);
        } else {
          let varName = arg.name;
          if (usedNames.has(varName)) {
            varName = `${fieldName}_${arg.name}`;
            let i = 2;
            while (usedNames.has(varName)) {
              varName = `${fieldName}_${arg.name}_${i}`;
              i++;
            }
          }
          usedNames.add(varName);
          varMap.set(argKey, { varName, type: arg.type });
        }
      }
    }

    const named = getNamedType(field.type);
    if (!isLeafType(field.type) && named) {
      collectVariablesFromSelections(selections, enabledArgs, named, fieldPath, nextVisited, depth + 1, varMap, usedNames);
    }
  }
};

const coerceScalarValue = (value, namedType) => {
  if (value === undefined || value === '' || value === null) return null;
  if (namedType.name === 'Boolean') return value === true || value === 'true';
  if (namedType.name === 'Int') {
    const n = parseInt(value, 10);
    return isNaN(n) ? value : n;
  }
  if (namedType.name === 'Float') {
    const n = parseFloat(value);
    return isNaN(n) ? value : n;
  }
  return String(value);
};

const buildVariableValue = (argKey, argType, argValues) => {
  const named = getNamedType(argType);
  const raw = argValues.get(argKey);
  if (Array.isArray(raw)) {
    const items = raw.map((v) => coerceScalarValue(v, named)).filter((v) => v !== null);
    return items.length > 0 ? items : null;
  }
  return coerceScalarValue(raw, named);
};

const placeholderSelectionSet = () => ({
  kind: Kind.SELECTION_SET,
  selections: [
    {
      kind: Kind.FIELD,
      name: { kind: Kind.NAME, value: PLACEHOLDER }
    }
  ]
});

const buildSelectionSetAST = (selections, namedType, parentPath, visited, depth, enabledArgs, varMap) => {
  if (!namedType || depth > MAX_DEPTH || visited.has(namedType.name)) {
    return null;
  }

  const nextVisited = new Set(visited);
  nextVisited.add(namedType.name);

  if (isUnionType(namedType)) {
    return buildUnionSelectionSet(selections, namedType, parentPath, nextVisited, depth, enabledArgs, varMap);
  }

  if (!isObjectType(namedType) && !isInterfaceType(namedType)) {
    return null;
  }

  const fieldMap = namedType.getFields();
  const fieldSelections = [];

  for (const [fieldName, field] of Object.entries(fieldMap)) {
    const fieldPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;
    if (!selections.has(fieldPath)) continue;

    const fieldAST = buildFieldAST(selections, field, fieldPath, nextVisited, depth, enabledArgs, varMap);
    if (fieldAST) {
      fieldSelections.push(fieldAST);
    }
  }

  if (fieldSelections.length === 0) return null;

  return {
    kind: Kind.SELECTION_SET,
    selections: fieldSelections
  };
};

const buildFieldAST = (selections, field, fieldPath, visited, depth, enabledArgs, varMap) => {
  const named = getNamedType(field.type);
  const args = buildArgumentsAST(field, fieldPath, enabledArgs, varMap);

  let selectionSet = null;
  if (!isLeafType(field.type)) {
    selectionSet = buildSelectionSetAST(selections, named, fieldPath, visited, depth + 1, enabledArgs, varMap);
    if (!selectionSet) {
      selectionSet = placeholderSelectionSet();
    }
  }

  return {
    kind: Kind.FIELD,
    name: { kind: Kind.NAME, value: field.name },
    arguments: args.length > 0 ? args : undefined,
    selectionSet: selectionSet || undefined
  };
};

const buildInputObjectWithVariables = (parentKey, inputType, enabledArgs, varMap) => {
  if (!inputType || !isInputObjectType(inputType)) return null;
  const fieldMap = inputType.getFields();
  const fields = [];

  for (const [fieldName, field] of Object.entries(fieldMap)) {
    const fieldKey = `${parentKey}.${fieldName}`;
    if (!enabledArgs.has(fieldKey)) continue;

    const named = getNamedType(field.type);
    if (isInputObjectType(named)) {
      const nestedObj = buildInputObjectWithVariables(fieldKey, named, enabledArgs, varMap);
      const value = nestedObj || { kind: Kind.NULL };
      fields.push({
        kind: Kind.OBJECT_FIELD,
        name: { kind: Kind.NAME, value: fieldName },
        value
      });
    } else {
      const varInfo = varMap.get(fieldKey);
      if (varInfo) {
        fields.push({
          kind: Kind.OBJECT_FIELD,
          name: { kind: Kind.NAME, value: fieldName },
          value: { kind: Kind.VARIABLE, name: { kind: Kind.NAME, value: varInfo.varName } }
        });
      }
    }
  }

  if (fields.length === 0) return null;
  return { kind: Kind.OBJECT, fields };
};

const buildArgumentsAST = (field, fieldPath, enabledArgs, varMap) => {
  if (!field.args || field.args.length === 0) return [];

  const args = [];
  for (const arg of field.args) {
    const key = `${fieldPath}.${arg.name}`;
    if (enabledArgs && !enabledArgs.has(key)) continue;

    const named = getNamedType(arg.type);
    if (isInputObjectType(named)) {
      const objValue = buildInputObjectWithVariables(key, named, enabledArgs, varMap);
      const value = objValue || { kind: Kind.NULL };
      args.push({
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: arg.name },
        value
      });
    } else {
      const varInfo = varMap.get(key);
      if (varInfo) {
        args.push({
          kind: Kind.ARGUMENT,
          name: { kind: Kind.NAME, value: arg.name },
          value: { kind: Kind.VARIABLE, name: { kind: Kind.NAME, value: varInfo.varName } }
        });
      }
    }
  }
  return args;
};

const buildUnionSelectionSet = (selections, unionType, parentPath, visited, depth, enabledArgs, varMap) => {
  const memberTypes = unionType.getTypes();
  const inlineFragments = [];

  for (const memberType of memberTypes) {
    const memberPath = `${parentPath}.__on_${memberType.name}`;
    let isMemberSelected = selections.has(memberPath);
    if (!isMemberSelected) {
      for (const s of selections) {
        if (s.startsWith(memberPath + '.')) {
          isMemberSelected = true;
          break;
        }
      }
    }

    if (!isMemberSelected) continue;

    let selectionSet = buildSelectionSetAST(selections, memberType, memberPath, visited, depth + 1, enabledArgs, varMap);
    if (!selectionSet) {
      selectionSet = placeholderSelectionSet();
    }
    inlineFragments.push({
      kind: Kind.INLINE_FRAGMENT,
      typeCondition: {
        kind: Kind.NAMED_TYPE,
        name: { kind: Kind.NAME, value: memberType.name }
      },
      selectionSet
    });
  }

  if (inlineFragments.length === 0) return null;

  return {
    kind: Kind.SELECTION_SET,
    selections: inlineFragments
  };
};

export const generateQueryString = (selections, argValues, schema, rootTypeName, enabledArgs, existingOperationName) => {
  if (!schema || !selections || selections.size === 0) return { query: '', variables: {} };
  const rootType = resolveRootType(schema, rootTypeName);
  if (!rootType) return { query: '', variables: {} };

  const varMap = new Map();
  const usedNames = new Set();
  collectVariablesFromSelections(selections, enabledArgs, rootType, rootTypeName, new Set(), 0, varMap, usedNames);

  const selectionSet = buildSelectionSetAST(selections, rootType, rootTypeName, new Set(), 0, enabledArgs, varMap);
  if (!selectionSet) return { query: '', variables: {} };

  const operation = rootTypeName === 'Query' ? 'query' : rootTypeName === 'Mutation' ? 'mutation' : 'subscription';

  let operationName = existingOperationName;
  if (!operationName) {
    const firstField = selectionSet.selections.find((s) => s.kind === Kind.FIELD);
    operationName = firstField
      ? firstField.name.value.charAt(0).toUpperCase() + firstField.name.value.slice(1)
      : rootTypeName;
  }

  const variableDefinitions = [];
  const variableValues = {};
  for (const [argKey, { varName, type }] of varMap) {
    variableDefinitions.push({
      kind: Kind.VARIABLE_DEFINITION,
      variable: { kind: Kind.VARIABLE, name: { kind: Kind.NAME, value: varName } },
      type: typeToAST(type)
    });
    const val = buildVariableValue(argKey, type, argValues);
    if (val !== null && val !== undefined) {
      variableValues[varName] = val;
    }
  }

  const document = {
    kind: Kind.DOCUMENT,
    definitions: [
      {
        kind: Kind.OPERATION_DEFINITION,
        operation,
        name: { kind: Kind.NAME, value: operationName },
        variableDefinitions: variableDefinitions.length > 0 ? variableDefinitions : undefined,
        selectionSet
      }
    ]
  };

  let result = print(document);
  result = result.replace(new RegExp(`^\\s*${PLACEHOLDER}\\n`, 'gm'), '');
  return { query: result, variables: variableValues };
};

export const validateQueryForSync = (queryString) => {
  if (!queryString || !queryString.trim()) {
    return { valid: true, error: null };
  }

  let doc;
  try {
    doc = gqlParse(sanitizeQueryForParsing(queryString));
  } catch {
    return { valid: false, error: null };
  }

  const operations = doc.definitions.filter((d) => d.kind === Kind.OPERATION_DEFINITION);
  if (operations.length === 0) {
    return { valid: false, error: null };
  }

  if (operations.length > 1) {
    return { valid: false, error: 'multiple_operations' };
  }

  return { valid: true, error: null };
};

export const parseQueryToState = (queryString, schema, variablesString) => {
  if (!schema) return null;

  if (!queryString || !queryString.trim()) {
    return { selections: new Set(), expandedPaths: new Set(), argValues: new Map(), enabledArgs: new Set() };
  }

  let doc;
  try {
    doc = gqlParse(sanitizeQueryForParsing(queryString));
  } catch {
    return null;
  }

  let variablesJson = {};
  if (variablesString) {
    try {
      variablesJson = JSON.parse(variablesString);
    } catch { /* ignore */ }
  }

  const selections = new Set();
  const expandedPaths = new Set();
  const argValues = new Map();
  const enabledArgs = new Set();

  for (const def of doc.definitions) {
    if (def.kind !== Kind.OPERATION_DEFINITION) continue;
    const rootTypeName = def.operation.charAt(0).toUpperCase() + def.operation.slice(1);
    const rootType = resolveRootType(schema, rootTypeName);
    if (!rootType || !def.selectionSet) continue;
    walkSelectionSet(def.selectionSet, rootType, rootTypeName, selections, expandedPaths, argValues, enabledArgs, variablesJson, schema);
  }

  return { selections, expandedPaths, argValues, enabledArgs };
};

const walkInputObjectValue = (valueNode, inputType, parentKey, argValues, enabledArgs, variablesJson) => {
  const objNode = valueNode.kind === Kind.LIST && valueNode.values.length > 0
    ? valueNode.values[0]
    : valueNode;

  if (objNode.kind !== Kind.OBJECT || !isInputObjectType(inputType)) return;

  const fieldMap = inputType.getFields();

  for (const astField of objNode.fields) {
    const fieldName = astField.name.value;
    if (fieldName === '__empty') continue;
    const fieldKey = `${parentKey}.${fieldName}`;
    enabledArgs.add(fieldKey);

    const fieldDef = fieldMap[fieldName];
    const fieldNamed = fieldDef ? getNamedType(fieldDef.type) : null;

    if (fieldNamed && isInputObjectType(fieldNamed)) {
      walkInputObjectValue(astField.value, fieldNamed, fieldKey, argValues, enabledArgs, variablesJson);
    } else if (astField.value.kind === Kind.VARIABLE) {
      const varName = astField.value.name.value;
      const varValue = variablesJson[varName];
      if (varValue !== undefined && varValue !== null) {
        argValues.set(fieldKey, String(varValue));
      }
    } else {
      const value = astValueToString(astField.value);
      if (value !== null && value !== '') {
        argValues.set(fieldKey, value);
      }
    }
  }
};

const walkVariableInputObject = (value, inputType, parentKey, argValues, enabledArgs) => {
  if (!value || typeof value !== 'object' || !isInputObjectType(inputType)) return;

  const obj = Array.isArray(value) ? value[0] : value;
  if (!obj || typeof obj !== 'object') return;

  const fieldMap = inputType.getFields();
  for (const [fieldName, fieldValue] of Object.entries(obj)) {
    const fieldKey = `${parentKey}.${fieldName}`;
    enabledArgs.add(fieldKey);

    const fieldDef = fieldMap[fieldName];
    if (!fieldDef) continue;
    const fieldNamed = getNamedType(fieldDef.type);

    if (isInputObjectType(fieldNamed)) {
      walkVariableInputObject(fieldValue, fieldNamed, fieldKey, argValues, enabledArgs);
    } else if (fieldValue !== null && fieldValue !== undefined) {
      argValues.set(fieldKey, String(fieldValue));
    }
  }
};

const walkSelectionSet = (selectionSet, parentType, parentPath, selections, expandedPaths, argValues, enabledArgs, variablesJson, schema, depth = 0) => {
  if (!selectionSet || !selectionSet.selections || depth > MAX_DEPTH) return;

  const fieldMap = (isObjectType(parentType) || isInterfaceType(parentType))
    ? parentType.getFields()
    : null;

  for (const sel of selectionSet.selections) {
    if (sel.kind === Kind.FIELD) {
      const fieldName = sel.name.value;
      if (fieldName === '__typename' || fieldName === PLACEHOLDER) continue;
      const fieldPath = parentPath ? `${parentPath}.${fieldName}` : fieldName;

      selections.add(fieldPath);

      if (sel.arguments && sel.arguments.length > 0 && fieldMap && fieldMap[fieldName]) {
        for (const argNode of sel.arguments) {
          const argKey = `${fieldPath}.${argNode.name.value}`;
          enabledArgs.add(argKey);

          const argDef = fieldMap[fieldName].args.find((a) => a.name === argNode.name.value);
          const argNamed = argDef ? getNamedType(argDef.type) : null;

          if (argNode.value.kind === Kind.VARIABLE) {
            const varName = argNode.value.name.value;
            const varValue = variablesJson[varName];
            if (argNamed && isInputObjectType(argNamed) && typeof varValue === 'object' && varValue !== null) {
              walkVariableInputObject(varValue, argNamed, argKey, argValues, enabledArgs);
            } else if (Array.isArray(varValue)) {
              argValues.set(argKey, varValue.map(String));
            } else if (varValue !== undefined && varValue !== null) {
              argValues.set(argKey, String(varValue));
            }
          } else if (argNamed && isInputObjectType(argNamed) && (argNode.value.kind === Kind.OBJECT || argNode.value.kind === Kind.LIST)) {
            walkInputObjectValue(argNode.value, argNamed, argKey, argValues, enabledArgs, variablesJson);
          } else if (argDef && containsListType(argDef.type) && argNode.value.kind === Kind.LIST) {
            // List-type scalar/enum args: store as array
            const items = argNode.value.values
              .map(astValueToString)
              .filter((v) => v !== null && v !== '');
            if (items.length > 0) {
              argValues.set(argKey, items);
            }
          } else {
            const value = astValueToString(argNode.value);
            if (value !== null && value !== '') {
              argValues.set(argKey, value);
            }
          }
        }
      }

      if (sel.selectionSet && fieldMap && fieldMap[fieldName]) {
        expandedPaths.add(fieldPath);
        const named = getNamedType(fieldMap[fieldName].type);
        if (named) {
          walkSelectionSet(sel.selectionSet, named, fieldPath, selections, expandedPaths, argValues, enabledArgs, variablesJson, schema, depth + 1);
        }
      }
    } else if (sel.kind === Kind.INLINE_FRAGMENT) {
      const typeName = sel.typeCondition?.name?.value;
      if (typeName) {
        const memberPath = `${parentPath}.__on_${typeName}`;
        selections.add(memberPath);
        expandedPaths.add(memberPath);

        // For unions, find the member type. For object/interface types with inline fragments, look up from schema.
        const named = getNamedType(parentType);
        const memberType = named?.getTypes?.()?.find((t) => t.name === typeName)
          || schema.getType(typeName);
        if (memberType && sel.selectionSet) {
          walkSelectionSet(sel.selectionSet, memberType, memberPath, selections, expandedPaths, argValues, enabledArgs, variablesJson, schema, depth + 1);
        }
      }
    }
  }
};

const astValueToString = (valueNode) => {
  if (!valueNode) return null;
  switch (valueNode.kind) {
    case Kind.NULL:
      return '';
    case Kind.STRING:
      return valueNode.value;
    case Kind.INT:
    case Kind.FLOAT:
      return valueNode.value;
    case Kind.BOOLEAN:
      return String(valueNode.value);
    case Kind.ENUM:
      return valueNode.value;
    case Kind.LIST:
      return JSON.stringify(valueNode.values.map(astValueToString));
    case Kind.OBJECT: {
      const obj = {};
      for (const field of valueNode.fields) {
        obj[field.name.value] = astValueToString(field.value);
      }
      return JSON.stringify(obj);
    }
    default:
      return '';
  }
};

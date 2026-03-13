import { useState, useCallback, useRef, useEffect } from 'react';
import { format } from 'prettier/standalone';
import prettierPluginGraphql from 'prettier/parser-graphql';
import { generateQueryString, getAvailableRootTypes, parseQueryToState, validateQueryForSync } from 'utils/graphql/queryBuilder';

const DEBOUNCE_MS = 150;
const SYNC_DEBOUNCE_MS = 400;

const isValidJson = (str) => {
  if (!str || !str.trim()) return true;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

const normalizeQuery = (q) => (q || '').replace(/\s+/g, ' ').trim();

const prettifyQuery = (query) => {
  try {
    let sanitized = query;
    sanitized = sanitized.replace(/(:\s*)\{\s*\}/g, '$1{ __empty: true }');
    sanitized = sanitized.replace(/\{\s*\}/g, '{ __typename }');
    let result = format(sanitized, { parser: 'graphql', plugins: [prettierPluginGraphql] });
    result = result.replace(/^\s*__typename\n/gm, '');
    result = result.replace(/\{\s*__empty:\s*true\s*\}/g, '{}');
    return result.trim();
  } catch {
    return query;
  }
};

const deleteSetByPrefix = (set, prefix) => {
  for (const k of set) {
    if (k === prefix || k.startsWith(prefix + '.')) {
      set.delete(k);
    }
  }
};

const deleteMapByPrefix = (map, prefix) => {
  for (const k of map.keys()) {
    if (k === prefix || k.startsWith(prefix + '.')) {
      map.delete(k);
    }
  }
};

const ensureAncestorsSelected = (selections, path) => {
  const parts = path.split('.');
  for (let i = 1; i < parts.length; i++) {
    selections.add(parts.slice(0, i).join('.'));
  }
};

export default function useQueryBuilder(schema, onQueryChange, editorValue, onVariablesChange, variablesValue) {
  const [selections, setSelections] = useState(new Set());
  const [expandedPaths, setExpandedPaths] = useState(new Set());
  const [argValues, setArgValues] = useState(new Map());
  const [enabledArgs, setEnabledArgs] = useState(new Set());
  const [syncError, _setSyncError] = useState(null);
  const syncErrorRef = useRef(null);
  const setSyncError = useCallback((val) => {
    syncErrorRef.current = val;
    _setSyncError(val);
  }, []);

  const debounceRef = useRef(null);
  const syncDebounceRef = useRef(null);
  const initialSyncDone = useRef(false);
  const lastGeneratedValue = useRef('');
  const lastGeneratedVarsValue = useRef('');
  const lastGeneratedVarNames = useRef(new Set());
  const shouldGenerate = useRef(false);
  const variablesValueRef = useRef(variablesValue);
  variablesValueRef.current = variablesValue;
  const editorValueRef = useRef(editorValue);
  editorValueRef.current = editorValue;
  const onVariablesChangeRef = useRef(onVariablesChange);
  onVariablesChangeRef.current = onVariablesChange;

  const availableRootTypes = getAvailableRootTypes(schema);

  useEffect(() => {
    setSelections(new Set());
    setExpandedPaths(new Set());
    setArgValues(new Map());
    setEnabledArgs(new Set());
    setSyncError(null);
    initialSyncDone.current = false;
    lastGeneratedValue.current = '';
    lastGeneratedVarsValue.current = '';
    lastGeneratedVarNames.current = new Set();
    shouldGenerate.current = false;
  }, [schema]);

  useEffect(() => {
    if (initialSyncDone.current || !schema || !editorValue) return;
    initialSyncDone.current = true;

    const validation = validateQueryForSync(editorValue);
    if (!validation.valid) {
      setSyncError(validation.error);
      return;
    }
    setSyncError(null);

    const state = parseQueryToState(editorValue, schema, variablesValue);
    if (!state || state.selections.size === 0) return;

    setSelections(state.selections);
    setExpandedPaths(state.expandedPaths);
    setArgValues(state.argValues);
    setEnabledArgs(state.enabledArgs);
    lastGeneratedValue.current = normalizeQuery(editorValue);
  }, [schema, editorValue]);

  useEffect(() => {
    if (!initialSyncDone.current || !schema) return;

    if (!editorValue || !editorValue.trim()) {
      setSyncError(null);
      setSelections(new Set());
      setArgValues(new Map());
      setEnabledArgs(new Set());
      lastGeneratedValue.current = '';
      if (onVariablesChangeRef.current && lastGeneratedVarNames.current.size > 0) {
        let existing = {};
        const currentVars = variablesValueRef.current;
        if (currentVars) {
          try { existing = JSON.parse(currentVars); } catch { /* ignore */ }
        }
        for (const name of lastGeneratedVarNames.current) {
          delete existing[name];
        }
        lastGeneratedVarNames.current = new Set();
        const varsString = Object.keys(existing).length > 0
          ? JSON.stringify(existing, null, 2) : '';
        lastGeneratedVarsValue.current = varsString;
        onVariablesChangeRef.current(varsString);
      }
      return;
    }

    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    syncDebounceRef.current = setTimeout(() => {
      const normalized = normalizeQuery(editorValue);
      const queryUnchanged = normalized === lastGeneratedValue.current;
      const varsUnchanged = (variablesValue || '') === lastGeneratedVarsValue.current;

      if (syncErrorRef.current) {
        const validation = validateQueryForSync(editorValue);
        if (!validation.valid) {
          setSyncError(validation.error);
          return;
        }
        setSyncError(null);
        const state = parseQueryToState(editorValue, schema, variablesValue);
        if (state) {
          setSelections(state.selections);
          setExpandedPaths((prev) => {
            const next = new Set(prev);
            for (const p of state.expandedPaths) next.add(p);
            return next;
          });
          setArgValues(state.argValues);
          setEnabledArgs(state.enabledArgs);
          lastGeneratedValue.current = normalized;
        }
        return;
      }

      if (queryUnchanged && varsUnchanged) {
        return;
      }

      if (!queryUnchanged) {
        const validation = validateQueryForSync(editorValue);
        if (!validation.valid) {
          setSyncError(validation.error);
          return;
        }
        setSyncError(null);
      }

      // Skip sync if variables JSON is invalid (e.g. trailing comma while typing)
      if (!isValidJson(variablesValue)) return;

      const state = parseQueryToState(editorValue, schema, variablesValue);
      if (!state) return;

      if (queryUnchanged) {
        setArgValues(state.argValues);
        return;
      }

      setSelections(state.selections);
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        for (const p of state.expandedPaths) {
          next.add(p);
        }
        return next;
      });
      setArgValues(state.argValues);
      setEnabledArgs(state.enabledArgs);
    }, SYNC_DEBOUNCE_MS);

    return () => {
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    };
  }, [editorValue, schema, variablesValue]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (!shouldGenerate.current) return;
      shouldGenerate.current = false;

      if (syncDebounceRef.current) {
        clearTimeout(syncDebounceRef.current);
        syncDebounceRef.current = null;
      }

      if (schema && onQueryChange && selections.size > 0) {
        const currentEditorValue = editorValueRef.current;
        const existingNames = {};
        if (currentEditorValue) {
          const nameRegex = /(?:query|mutation|subscription)\s+(\w+)/g;
          let m;
          while ((m = nameRegex.exec(currentEditorValue)) !== null) {
            const op = currentEditorValue.slice(m.index).match(/^(query|mutation|subscription)/)[1];
            const rootKey = op.charAt(0).toUpperCase() + op.slice(1);
            existingNames[rootKey] = m[1];
          }
        }
        const queryParts = [];
        let allVariables = {};
        for (const rootType of availableRootTypes) {
          const result = generateQueryString(selections, argValues, schema, rootType, enabledArgs, existingNames[rootType]);
          if (result.query) {
            queryParts.push(result.query);
            Object.assign(allVariables, result.variables);
          }
        }

        if (queryParts.length > 1) {
          setSyncError('multiple_operations');
        } else {
          setSyncError(null);
        }

        const queryResult = prettifyQuery(queryParts.join('\n\n'));
        lastGeneratedValue.current = normalizeQuery(queryResult);
        onQueryChange(queryResult);

        const onVarsChange = onVariablesChangeRef.current;
        if (onVarsChange) {
          const newVarNames = new Set(Object.keys(allVariables));

          let existing = {};
          const currentVarsValue = variablesValueRef.current;
          if (currentVarsValue) {
            try { existing = JSON.parse(currentVarsValue); } catch { /* start fresh */ }
          }

          for (const name of lastGeneratedVarNames.current) {
            if (!newVarNames.has(name)) {
              delete existing[name];
            }
          }

          Object.assign(existing, allVariables);
          lastGeneratedVarNames.current = newVarNames;

          const varsString = Object.keys(existing).length > 0
            ? JSON.stringify(existing, null, 2)
            : '';
          lastGeneratedVarsValue.current = varsString;
          onVarsChange(varsString);
        }
      } else {
        setSyncError(null);

        if (onQueryChange && selections.size === 0 && lastGeneratedValue.current !== '') {
          lastGeneratedValue.current = '';
          onQueryChange('');

          const onVarsChange = onVariablesChangeRef.current;
          if (onVarsChange && lastGeneratedVarNames.current.size > 0) {
            let existing = {};
            const currentVarsValue = variablesValueRef.current;
            if (currentVarsValue) {
              try { existing = JSON.parse(currentVarsValue); } catch { /* ignore */ }
            }
            for (const name of lastGeneratedVarNames.current) {
              delete existing[name];
            }
            lastGeneratedVarNames.current = new Set();
            const varsString = Object.keys(existing).length > 0
              ? JSON.stringify(existing, null, 2)
              : '';
            lastGeneratedVarsValue.current = varsString;
            onVarsChange(varsString);
          }
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selections, argValues, enabledArgs, schema, availableRootTypes, onQueryChange]);

  const toggleField = useCallback((path, field) => {
    shouldGenerate.current = true;
    const isUnchecking = selections.has(path);

    if (isUnchecking) {
      const cleanedArgs = new Set(enabledArgs);
      deleteSetByPrefix(cleanedArgs, path);
      setEnabledArgs(cleanedArgs);

      setArgValues((prev) => {
        const next = new Map(prev);
        deleteMapByPrefix(next, path);
        return next;
      });
    }

    setSelections((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
        for (const p of prev) {
          if (p.startsWith(path + '.')) {
            next.delete(p);
          }
        }
      } else {
        next.add(path);
        ensureAncestorsSelected(next, path);
      }
      return next;
    });

    if (field && !field.isLeaf) {
      setExpandedPaths((prev) => {
        const next = new Set(prev);
        if (!prev.has(path)) {
          next.add(path);
        }
        return next;
      });
    }

    if (!isUnchecking && field && field.args && field.args.length > 0) {
      setEnabledArgs((prev) => {
        const next = new Set(prev);
        for (const arg of field.args) {
          const key = `${path}.${arg.name}`;
          if (arg.isRequired) {
            next.add(key);
          }
        }
        return next;
      });
    }
  }, [selections, enabledArgs]);

  const toggleExpand = useCallback((path) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  const toggleArg = useCallback((fieldPath, argName) => {
    shouldGenerate.current = true;
    const key = `${fieldPath}.${argName}`;
    const enabling = !enabledArgs.has(key);

    const nextEnabledArgs = new Set(enabledArgs);
    if (enabling) {
      nextEnabledArgs.add(key);
    } else {
      nextEnabledArgs.delete(key);
      deleteSetByPrefix(nextEnabledArgs, key);
    }
    setEnabledArgs(nextEnabledArgs);

    if (enabling) {
      setSelections((prev) => {
        if (prev.has(fieldPath)) return prev;
        const next = new Set(prev);
        next.add(fieldPath);
        ensureAncestorsSelected(next, fieldPath);
        return next;
      });
    } else {
      setArgValues((prev) => {
        const next = new Map(prev);
        deleteMapByPrefix(next, key);
        return next;
      });
    }
  }, [enabledArgs]);

  const updateArgValue = useCallback((key, value) => {
    shouldGenerate.current = true;
    setArgValues((prev) => {
      const next = new Map(prev);
      const isEmpty = value === '' || value === undefined
        || (Array.isArray(value) && value.length === 0);
      if (isEmpty) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
  }, []);

  const setArgValue = useCallback((fieldPath, argName, value) => {
    updateArgValue(`${fieldPath}.${argName}`, value);
  }, [updateArgValue]);

  const toggleInputField = useCallback((fullKey, fieldPath) => {
    shouldGenerate.current = true;
    const enabling = !enabledArgs.has(fullKey);

    setEnabledArgs((prev) => {
      const next = new Set(prev);
      if (enabling) {
        next.add(fullKey);
        const suffix = fullKey.slice(fieldPath.length + 1);
        const parts = suffix.split('.');
        for (let i = 1; i < parts.length; i++) {
          next.add(`${fieldPath}.${parts.slice(0, i).join('.')}`);
        }
      } else {
        next.delete(fullKey);
        deleteSetByPrefix(next, fullKey);
      }
      return next;
    });

    if (enabling) {
      setSelections((prev) => {
        if (prev.has(fieldPath)) return prev;
        const next = new Set(prev);
        next.add(fieldPath);
        ensureAncestorsSelected(next, fieldPath);
        return next;
      });
    } else {
      setArgValues((prev) => {
        const next = new Map(prev);
        deleteMapByPrefix(next, fullKey);
        return next;
      });
    }
  }, [enabledArgs]);

  const setInputFieldValue = useCallback((fullKey, value) => {
    updateArgValue(fullKey, value);
  }, [updateArgValue]);

  return {
    selections,
    expandedPaths,
    argValues,
    enabledArgs,
    availableRootTypes,
    syncError,
    toggleField,
    toggleExpand,
    toggleArg,
    setArgValue,
    toggleInputField,
    setInputFieldValue
  };
}

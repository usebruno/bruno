import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { IconCloudDownload, IconFileUpload, IconAlertTriangle, IconChevronRight, IconChevronDown } from '@tabler/icons';
import { getRootFields } from 'utils/graphql/queryBuilder';
import useQueryBuilder from 'hooks/useQueryBuilder';
import QueryBuilderTree from './QueryBuilderTree';
import StyledWrapper from './StyledWrapper';

const QueryBuilder = ({ schema, onQueryChange, editorValue, onVariablesChange, variablesValue, loadSchema, isSchemaLoading, schemaError }) => {
  const {
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
  } = useQueryBuilder(schema, onQueryChange, editorValue, onVariablesChange, variablesValue);

  const [searchText, setSearchText] = useState('');
  const [expandedRootTypes, setExpandedRootTypes] = useState(() => new Set(availableRootTypes));

  useEffect(() => {
    if (schema) {
      setExpandedRootTypes(new Set(availableRootTypes));
    }
  }, [schema]);

  const effectiveExpandedRootTypes = useMemo(() => {
    if (searchText.trim()) return new Set(availableRootTypes);
    return expandedRootTypes;
  }, [searchText, expandedRootTypes, availableRootTypes]);

  const toggleRootType = useCallback((type) => {
    setExpandedRootTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const rootFieldsByType = useMemo(() => {
    const map = {};
    for (const type of availableRootTypes) {
      map[type] = getRootFields(schema, type);
    }
    return map;
  }, [schema, availableRootTypes]);

  // Determine which root type is active (has selections) — only one allowed at a time
  const activeRootType = useMemo(() => {
    for (const type of availableRootTypes) {
      for (const path of selections) {
        if (path.startsWith(type + '.')) return type;
      }
    }
    return null;
  }, [selections, availableRootTypes]);

  // Filter fields by search text
  const filteredFieldsByType = useMemo(() => {
    if (!searchText.trim()) return rootFieldsByType;
    const lower = searchText.toLowerCase();
    const map = {};
    for (const type of availableRootTypes) {
      map[type] = (rootFieldsByType[type] || []).filter((f) =>
        f.name.toLowerCase().includes(lower)
      );
    }
    return map;
  }, [rootFieldsByType, searchText, availableRootTypes]);

  if (!schema) {
    return (
      <StyledWrapper>
        <div className="schema-empty-state">
          {schemaError ? (
            <>
              <IconAlertTriangle size={32} strokeWidth={1.5} className="empty-state-icon warning" />
              <div className="empty-state-title">Failed to Load Schema</div>
              <div className="empty-state-description">{schemaError.message}</div>
              <button
                className="empty-state-btn"
                onClick={() => loadSchema('introspection')}
                disabled={isSchemaLoading}
              >
                <IconCloudDownload size={16} strokeWidth={1.5} />
                {isSchemaLoading ? 'Loading...' : 'Try Again'}
              </button>
            </>
          ) : (
            <>
              <div className="empty-state-title">No Schema Loaded</div>
              <div className="empty-state-description">
                Load a GraphQL schema to explore operations and build queries visually.
              </div>
              <button
                className="empty-state-btn"
                onClick={() => loadSchema('introspection')}
                disabled={isSchemaLoading}
              >
                <IconCloudDownload size={16} strokeWidth={1.5} />
                {isSchemaLoading ? 'Loading...' : 'Load from Introspection'}
              </button>
            </>
          )}
          <button
            className="empty-state-btn"
            onClick={() => loadSchema('file')}
            disabled={isSchemaLoading}
          >
            <IconFileUpload size={16} strokeWidth={1.5} />
            Upload Schema File
          </button>
        </div>
      </StyledWrapper>
    );
  }

  if (syncError) {
    return (
      <StyledWrapper>
        <div className="sync-error-banner">
          <IconAlertTriangle size={13} strokeWidth={1.5} className="sync-error-icon" />
          <div className="sync-error-text">
            {syncError === 'multiple_operations' ? (
              <>
                <strong>Multiple operations detected</strong>
                <span>The Query Builder supports a single operation at a time. Combine into one operation to sync.</span>
              </>
            ) : null}
          </div>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <div className="query-builder-search">
        <input
          type="text"
          placeholder="Search operations..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <div className="query-builder-tree">
        {availableRootTypes.map((rootType) => {
          const isExpanded = effectiveExpandedRootTypes.has(rootType);
          const fields = filteredFieldsByType[rootType] || [];
          const isDisabled = activeRootType !== null && activeRootType !== rootType;

          return (
            <div key={rootType} className={isDisabled ? 'root-type-disabled' : ''}>
              <button
                type="button"
                className="root-type-node"
                onClick={() => !isDisabled && toggleRootType(rootType)}
                aria-expanded={isExpanded}
                disabled={isDisabled}
              >
                <span className="field-chevron">
                  {isExpanded && !isDisabled ? (
                    <IconChevronDown size={14} strokeWidth={2} />
                  ) : (
                    <IconChevronRight size={14} strokeWidth={2} />
                  )}
                </span>
                <span className="root-type-name">{rootType}</span>
                <span className="root-type-count">{(rootFieldsByType[rootType] || []).length}</span>
              </button>
              {isExpanded && !isDisabled && (
                fields.length > 0 ? (
                  <QueryBuilderTree
                    fields={fields}
                    depth={1}
                    selections={selections}
                    expandedPaths={expandedPaths}
                    argValues={argValues}
                    enabledArgs={enabledArgs}
                    onToggleCheck={toggleField}
                    onToggleExpand={toggleExpand}
                    onToggleArg={toggleArg}
                    onArgChange={setArgValue}
                    onToggleInputField={toggleInputField}
                    onSetInputFieldValue={setInputFieldValue}
                  />
                ) : (
                  <div className="empty-state">
                    {searchText ? 'No matching fields.' : 'No fields available.'}
                  </div>
                )
              )}
            </div>
          );
        })}
      </div>
    </StyledWrapper>
  );
};

export default QueryBuilder;

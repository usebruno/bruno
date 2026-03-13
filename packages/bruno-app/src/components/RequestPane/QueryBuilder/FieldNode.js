import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { IconChevronRight, IconChevronDown, IconTrash, IconInfoCircle } from '@tabler/icons';
import { nanoid } from 'nanoid';
import { getInputObjectFields } from 'utils/graphql/queryBuilder';

const ListArgValueInput = ({ values, onChange, field, indent }) => {
  const [items, setItems] = useState(() => {
    const vals = Array.isArray(values) ? values : (values ? [values] : []);
    return vals.map((v) => ({ id: nanoid(), value: v }));
  });
  const lastExternalRef = useRef(values);
  const focusIdRef = useRef(null);
  const listRef = useRef(null);

  // Sync internal items when values prop changes externally (e.g. editor edits)
  if (values !== lastExternalRef.current) {
    lastExternalRef.current = values;
    const vals = Array.isArray(values) ? values : (values ? [values] : []);
    const currentValues = items.map((i) => i.value);
    // Only re-sync if the values actually differ (avoid overwriting on our own onChange)
    if (JSON.stringify(vals) !== JSON.stringify(currentValues)) {
      setItems(vals.map((v) => ({ id: nanoid(), value: v })));
    }
  }

  const syncItems = (nextItems) => {
    setItems(nextItems);
    onChange(nextItems.map((item) => item.value));
  };

  const handleItemChange = (id, newValue) => {
    syncItems(items.map((item) => (item.id === id ? { ...item, value: newValue } : item)));
  };

  const handleAdd = (newValue) => {
    if (newValue === '' || newValue === undefined) return;
    const id = nanoid();
    focusIdRef.current = id;
    syncItems([...items, { id, value: newValue }]);
  };

  const handleRemove = (id) => {
    syncItems(items.filter((item) => item.id !== id));
  };

  useEffect(() => {
    if (focusIdRef.current && listRef.current) {
      const row = listRef.current.querySelector(`[data-item-id="${focusIdRef.current}"] input`);
      if (row) {
        row.focus();
        // Place cursor at end
        const len = row.value.length;
        row.setSelectionRange(len, len);
      }
      focusIdRef.current = null;
    }
  });

  return (
    <div ref={listRef}>
      {items.map((item) => (
        <div key={item.id} data-item-id={item.id} className="arg-row" style={{ paddingLeft: indent }} onClick={(e) => e.stopPropagation()}>
          <ArgValueInput value={item.value} onChange={(v) => handleItemChange(item.id, v)} field={field} />
          <button
            type="button"
            className="list-arg-remove"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove(item.id);
            }}
            aria-label="Remove item"
          >
            <IconTrash size={13} strokeWidth={1.5} />
          </button>
        </div>
      ))}
      <div className="arg-row" style={{ paddingLeft: indent }} onClick={(e) => e.stopPropagation()}>
        <ArgValueInput value="" onChange={handleAdd} field={field} />
        <span className="list-arg-remove-spacer" />
      </div>
    </div>
  );
};

const ArgValueInput = ({ value, onChange, field }) => {
  if (field.isEnum && field.enumValues) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} onClick={(e) => e.stopPropagation()}>
        <option value="">Select option</option>
        {field.enumValues.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    );
  }
  if (field.isBoolean) {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} onClick={(e) => e.stopPropagation()}>
        <option value="">Select option</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      placeholder="Enter value"
    />
  );
};

const InputObjectFields = ({ namedType, parentKey, fieldPath, indent, argValues, enabledArgs, onToggleInputField, onSetInputFieldValue }) => {
  const [expandedFields, setExpandedFields] = useState(new Set());
  const fields = useMemo(() => getInputObjectFields(namedType), [namedType]);

  if (!fields || fields.length === 0) return null;

  return fields.map((field) => {
    const fieldKey = `${parentKey}.${field.name}`;
    const isEnabled = enabledArgs ? enabledArgs.has(fieldKey) : false;
    const isExpanded = expandedFields.has(field.name);
    const value = argValues.get(fieldKey) ?? '';

    const toggleExpand = (e) => {
      e.stopPropagation();
      setExpandedFields((prev) => {
        const next = new Set(prev);
        if (next.has(field.name)) next.delete(field.name);
        else next.add(field.name);
        return next;
      });
    };

    const isListOfInputObject = field.isList && field.isInputObject;
    const isExpandable = field.isInputObject && !isListOfInputObject;

    return (
      <React.Fragment key={field.name}>
        <div className="arg-row" style={{ paddingLeft: indent }} onClick={isExpandable ? toggleExpand : (e) => e.stopPropagation()}>
          {isExpandable ? (
            <button type="button" className="field-chevron input-object-chevron" onClick={toggleExpand} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
              {isExpanded ? (
                <IconChevronDown size={12} strokeWidth={2} />
              ) : (
                <IconChevronRight size={12} strokeWidth={2} />
              )}
            </button>
          ) : (
            <span className="input-object-chevron-spacer" />
          )}
          <input
            type="checkbox"
            className="field-checkbox"
            checked={isEnabled}
            onChange={(e) => {
              e.stopPropagation();
              const willEnable = !isEnabled;
              onToggleInputField(fieldKey, fieldPath);
              if (isExpandable && willEnable) {
                setExpandedFields((prev) => {
                  const next = new Set(prev);
                  next.add(field.name);
                  return next;
                });
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="arg-name">{field.name}</span>
          {field.isRequired && <span className="arg-required">!</span>}
          {(!isEnabled || field.isInputObject) && <span className="field-type">{field.typeLabel}</span>}
          {isListOfInputObject && (
            <span className="list-complex-unsupported" title="List arguments for complex types are not currently supported.">
              <IconInfoCircle size={13} strokeWidth={1.5} />
            </span>
          )}
          {!field.isInputObject && isEnabled && (
            <ArgValueInput value={value} onChange={(v) => onSetInputFieldValue(fieldKey, v)} field={field} />
          )}
        </div>
        {isExpandable && isExpanded && (
          <InputObjectFields
            namedType={field.namedType}
            parentKey={fieldKey}
            fieldPath={fieldPath}
            indent={indent + 20}
            argValues={argValues}
            enabledArgs={enabledArgs}
            onToggleInputField={onToggleInputField}
            onSetInputFieldValue={onSetInputFieldValue}
          />
        )}
      </React.Fragment>
    );
  });
};

const FieldNode = ({
  field,
  depth,
  isChecked,
  isExpanded,
  onToggleCheck,
  onToggleExpand,
  argValues,
  enabledArgs,
  onToggleArg,
  onArgChange,
  onToggleInputField,
  onSetInputFieldValue,
  isCircular,
  hasChildren
}) => {
  const indent = depth * 20;

  const handleCheck = useCallback(
    (e) => {
      e.stopPropagation();
      onToggleCheck(field.path, field);
    },
    [field, onToggleCheck]
  );

  const handleExpand = useCallback(
    (e) => {
      e.stopPropagation();
      if (!field.isLeaf && !isCircular) {
        onToggleExpand(field.path);
      }
    },
    [field.path, field.isLeaf, isCircular, onToggleExpand]
  );

  // Union member type row (e.g. "... on Human")
  if (field.isUnionMember) {
    return (
      <div
        className="field-node"
        role="treeitem"
        aria-expanded={isExpanded}
        onClick={handleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleExpand(e);
          }
        }}
        tabIndex={0}
      >
        <span className="field-indent" style={{ width: indent }} />
        <span className="field-chevron">
          {isExpanded ? (
            <IconChevronDown size={14} strokeWidth={2} />
          ) : (
            <IconChevronRight size={14} strokeWidth={2} />
          )}
        </span>
        <input
          type="checkbox"
          className="field-checkbox"
          checked={isChecked}
          onChange={handleCheck}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="union-label">... on {field.name}</span>
      </div>
    );
  }

  const hasArgs = field.args && field.args.length > 0;
  const showSections = isExpanded && (hasArgs || hasChildren);
  const sectionIndent = (depth + 1) * 20;

  return (
    <>
      <div
        className="field-node"
        role="treeitem"
        aria-expanded={!field.isLeaf && !isCircular ? isExpanded : undefined}
        onClick={handleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleExpand(e);
          }
        }}
        tabIndex={0}
      >
        <span className="field-indent" style={{ width: indent }} />
        <span className="field-chevron">
          {!field.isLeaf && !isCircular ? (
            isExpanded ? (
              <IconChevronDown size={14} strokeWidth={2} />
            ) : (
              <IconChevronRight size={14} strokeWidth={2} />
            )
          ) : null}
        </span>
        <input
          type="checkbox"
          className="field-checkbox"
          checked={isChecked}
          onChange={handleCheck}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="field-name">{field.name}</span>
        <span className="field-separator">:</span>
        <span className="field-type">{field.typeLabel}</span>
        {isCircular && <span className="circular-indicator">circular</span>}
      </div>

      {showSections && hasArgs && (
        <>
          <div className="section-header" style={{ paddingLeft: sectionIndent }}>
            ARGUMENTS
          </div>
          {field.args.map((arg) => {
            const argKey = `${field.path}.${arg.name}`;
            const isArgEnabled = enabledArgs ? enabledArgs.has(argKey) : false;
            const argValue = argValues.get(argKey) ?? '';

            // List of input objects: show unsupported message
            if (arg.isList && arg.isInputObject) {
              return (
                <div key={arg.name} className="arg-row" style={{ paddingLeft: sectionIndent + 8 }} onClick={(e) => e.stopPropagation()}>
                  <span className="input-object-chevron-spacer" />
                  <input
                    type="checkbox"
                    className="field-checkbox"
                    checked={isArgEnabled}
                    onChange={() => onToggleArg && onToggleArg(field.path, arg.name)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="arg-name">{arg.name}</span>
                  {arg.isRequired && <span className="arg-required">!</span>}
                  <span className="field-type">{arg.typeLabel}</span>
                  <span className="list-complex-unsupported" title="List arguments for complex types are not currently supported.">
                    <IconInfoCircle size={13} strokeWidth={1.5} />
                  </span>
                </div>
              );
            }

            // Input object arg: render as expandable with children
            if (arg.isInputObject) {
              return (
                <InputObjectArgRow
                  key={arg.name}
                  arg={arg}
                  argKey={argKey}
                  fieldPath={field.path}
                  isArgEnabled={isArgEnabled}
                  sectionIndent={sectionIndent}
                  argValues={argValues}
                  enabledArgs={enabledArgs}
                  onToggleArg={onToggleArg}
                  onToggleInputField={onToggleInputField}
                  onSetInputFieldValue={onSetInputFieldValue}
                />
              );
            }

            if (arg.isList && !arg.isInputObject) {
              return (
                <ListArgRow
                  key={arg.name}
                  arg={arg}
                  fieldPath={field.path}
                  isArgEnabled={isArgEnabled}
                  argValue={argValue}
                  sectionIndent={sectionIndent}
                  onToggleArg={onToggleArg}
                  onArgChange={onArgChange}
                />
              );
            }

            return (
              <div key={arg.name} className="arg-row" style={{ paddingLeft: sectionIndent + 8 }} onClick={(e) => e.stopPropagation()}>
                <span className="input-object-chevron-spacer" />
                <input
                  type="checkbox"
                  className="field-checkbox"
                  checked={isArgEnabled}
                  onChange={() => onToggleArg && onToggleArg(field.path, arg.name)}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="arg-name">{arg.name}</span>
                {arg.isRequired && <span className="arg-required">!</span>}
                {!isArgEnabled && <span className="field-type">{arg.typeLabel}</span>}
                {isArgEnabled && (
                  <ArgValueInput value={argValue} onChange={(v) => onArgChange(field.path, arg.name, v)} field={arg} />
                )}
              </div>
            );
          })}
        </>
      )}

      {showSections && hasChildren && hasArgs && (
        <div className="section-header" style={{ paddingLeft: sectionIndent }}>
          FIELDS
        </div>
      )}
    </>
  );
};

const InputObjectArgRow = ({ arg, argKey, fieldPath, isArgEnabled, sectionIndent, argValues, enabledArgs, onToggleArg, onToggleInputField, onSetInputFieldValue }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleCheck = (e) => {
    e.stopPropagation();
    const willEnable = !isArgEnabled;
    onToggleArg && onToggleArg(fieldPath, arg.name);
    // Auto-expand when checking only
    if (willEnable) {
      setIsExpanded(true);
    }
  };

  return (
    <>
      <div
        className="arg-row"
        style={{ paddingLeft: sectionIndent + 8 }}
        onClick={toggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpand(e);
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
      >
        <span className="field-chevron input-object-chevron">
          {isExpanded ? (
            <IconChevronDown size={12} strokeWidth={2} />
          ) : (
            <IconChevronRight size={12} strokeWidth={2} />
          )}
        </span>
        <input
          type="checkbox"
          className="field-checkbox"
          checked={isArgEnabled}
          onChange={handleCheck}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="arg-name">{arg.name}</span>
        {arg.isRequired && <span className="arg-required">!</span>}
        <span className="field-type">{arg.typeLabel}</span>
      </div>
      {isExpanded && arg.namedType && (
        <InputObjectFields
          namedType={arg.namedType}
          parentKey={argKey}
          fieldPath={fieldPath}
          indent={sectionIndent + 28}
          argValues={argValues}
          enabledArgs={enabledArgs}
          onToggleInputField={onToggleInputField}
          onSetInputFieldValue={onSetInputFieldValue}
        />
      )}
    </>
  );
};

const ListArgRow = ({ arg, fieldPath, isArgEnabled, argValue, sectionIndent, onToggleArg, onArgChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  };

  const handleCheck = (e) => {
    e.stopPropagation();
    const willEnable = !isArgEnabled;
    onToggleArg && onToggleArg(fieldPath, arg.name);
    if (willEnable) {
      setIsExpanded(true);
    }
  };

  return (
    <>
      <div
        className="arg-row"
        style={{ paddingLeft: sectionIndent + 8 }}
        onClick={toggleExpand}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpand(e);
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
      >
        <span className="field-chevron input-object-chevron">
          {isExpanded ? (
            <IconChevronDown size={12} strokeWidth={2} />
          ) : (
            <IconChevronRight size={12} strokeWidth={2} />
          )}
        </span>
        <input
          type="checkbox"
          className="field-checkbox"
          checked={isArgEnabled}
          onChange={handleCheck}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="arg-name">{arg.name}</span>
        {arg.isRequired && <span className="arg-required">!</span>}
        <span className="field-type">{arg.typeLabel}</span>
      </div>
      {isExpanded && isArgEnabled && (
        <ListArgValueInput
          values={argValue}
          onChange={(v) => onArgChange(fieldPath, arg.name, v)}
          field={arg}
          indent={sectionIndent + 28}
        />
      )}
    </>
  );
};

export default React.memo(FieldNode);

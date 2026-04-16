import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash, IconAlertCircle, IconInfoCircle } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import { useSelector, useDispatch } from 'react-redux';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import MultiLineEditor from 'components/MultiLineEditor/index';
import StyledWrapper from './StyledWrapper';
import { uuid } from 'utils/common';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { variableNameRegex } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import { getGlobalEnvironmentVariables } from 'utils/collections';
import { stripEnvVarUid } from 'utils/environments';

const MIN_H = 35 * 2;
const MIN_COLUMN_WIDTH = 80;

const TableRow = React.memo(
  ({ children, item, style, ...rest }) => (
    <tr key={item.uid} style={style} {...rest} data-testid={`env-var-row-${item?.name}`}>
      {children}
    </tr>
  ),
  (prevProps, nextProps) => {
    const prevUid = prevProps?.item?.uid;
    const nextUid = nextProps?.item?.uid;
    return prevUid === nextUid && prevProps.children === nextProps.children;
  }
);

const EnvironmentVariablesTable = ({
  environment,
  collection,
  onSave,
  draft,
  onDraftChange,
  onDraftClear,
  setIsModified,
  renderExtraValueContent,
  searchQuery = ''
}) => {
  const { storedTheme } = useTheme();
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const activeWorkspace = useSelector((state) => {
    const uid = state.workspaces?.activeWorkspaceUid;
    return state.workspaces?.workspaces?.find((w) => w.uid === uid);
  });

  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const hasDraftForThisEnv = draft?.environmentUid === environment.uid;

  const rowCount = (environment.variables?.length || 0) + 1;
  const [tableHeight, setTableHeight] = useState(rowCount * 35);

  // Use environment UID as part of tableId so each environment has its own column widths
  const tableId = `env-vars-table-${environment.uid}`;

  // Get column widths from Redux - derived value (not state)
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const storedColumnWidths = focusedTab?.tableColumnWidths?.[tableId];

  // Local state initialized from Redux (computed once on mount/environment change via key)
  const [columnWidths, setColumnWidths] = useState(() => {
    return storedColumnWidths || { name: '30%', value: 'auto' };
  });

  const [resizing, setResizing] = useState(null);
  const [pinnedData, setPinnedData] = useState({ query: '', uids: new Set() });

  const handleColumnWidthsChange = (id, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId: id, widths }));
  };

  // Store column widths in ref for access in event handlers
  const columnWidthsRef = useRef(columnWidths);
  columnWidthsRef.current = columnWidths;

  const handleResizeStart = useCallback((e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();

    const currentCell = e.target.closest('td');
    const nextCell = currentCell?.nextElementSibling;
    if (!currentCell || !nextCell) return;

    const startX = e.clientX;
    const startWidth = currentCell.offsetWidth;
    const nextColumnKey = 'value';
    const nextColumnStartWidth = nextCell.offsetWidth;

    setResizing(columnKey);

    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const maxGrow = nextColumnStartWidth - MIN_COLUMN_WIDTH;
      const maxShrink = startWidth - MIN_COLUMN_WIDTH;
      const clampedDiff = Math.max(-maxShrink, Math.min(maxGrow, diff));

      const newWidths = {
        [columnKey]: `${startWidth + clampedDiff}px`,
        [nextColumnKey]: `${nextColumnStartWidth - clampedDiff}px`
      };
      setColumnWidths(newWidths);
    };

    const handleMouseUp = () => {
      setResizing(null);
      // Save to Redux after resize ends using ref for latest values
      handleColumnWidthsChange(tableId, columnWidthsRef.current);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [handleColumnWidthsChange]);

  const handleTotalHeightChanged = useCallback((h) => {
    setTableHeight(h);
  }, []);

  const handleRowFocus = useCallback((uid) => {
    setPinnedData((prev) => ({
      query: searchQuery,
      uids: prev.query === searchQuery ? new Set([...prev.uids, uid]) : new Set([uid])
    }));
  }, [searchQuery]);

  const prevEnvUidRef = useRef(null);
  const prevEnvVariablesRef = useRef(environment.variables);
  const mountedRef = useRef(false);

  let _collection = collection ? cloneDeep(collection) : {};
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  if (_collection) {
    _collection.globalEnvironmentVariables = globalEnvironmentVariables;
  }

  // When collection is null (global/workspace environments), populate process env
  // variables from the active workspace so that {{process.env.X}} can resolve
  if (!collection && activeWorkspace?.processEnvVariables) {
    _collection.workspaceProcessEnvVariables = activeWorkspace.processEnvVariables;
  }

  const initialValues = useMemo(() => {
    const vars = environment.variables || [];
    return [
      ...vars,
      {
        uid: uuid(),
        name: '',
        value: '',
        type: 'text',
        secret: false,
        enabled: true
      }
    ];
  }, [environment.uid, environment.variables]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: initialValues,
    validationSchema: Yup.array().of(
      Yup.object({
        enabled: Yup.boolean(),
        name: Yup.string().when('$isLastRow', {
          is: true,
          then: (schema) => schema.optional(),
          otherwise: (schema) =>
            schema
              .required('Name cannot be empty')
              .matches(
                variableNameRegex,
                'Name contains invalid characters. Must only contain alphanumeric characters, "-", "_", "." and cannot start with a digit.'
              )
              .trim()
        }),
        secret: Yup.boolean(),
        type: Yup.string(),
        uid: Yup.string(),
        value: Yup.mixed().nullable()
      })
    ),
    validate: (values) => {
      const errors = {};
      values.forEach((variable, index) => {
        const isLastRow = index === values.length - 1;
        const isEmptyRow = !variable.name || variable.name.trim() === '';

        if (isLastRow && isEmptyRow) {
          return;
        }

        if (!variable.name || variable.name.trim() === '') {
          if (!errors[index]) errors[index] = {};
          errors[index].name = 'Name cannot be empty';
        } else if (!variableNameRegex.test(variable.name)) {
          if (!errors[index]) errors[index] = {};
          errors[index].name
            = 'Name contains invalid characters. Must only contain alphanumeric characters, "-", "_", "." and cannot start with a digit.';
        }
      });
      return Object.keys(errors).length > 0 ? errors : {};
    },
    onSubmit: () => {}
  });

  // Restore draft values on mount or environment switch
  useEffect(() => {
    const isMount = !mountedRef.current;
    const envChanged = prevEnvUidRef.current !== null && prevEnvUidRef.current !== environment.uid;
    const variablesReloaded = !isMount && !envChanged && prevEnvVariablesRef.current !== environment.variables;

    prevEnvUidRef.current = environment.uid;
    prevEnvVariablesRef.current = environment.variables;
    mountedRef.current = true;

    if ((isMount || envChanged || variablesReloaded) && hasDraftForThisEnv && draft?.variables) {
      formik.setValues([
        ...draft.variables,
        {
          uid: uuid(),
          name: '',
          value: '',
          type: 'text',
          secret: false,
          enabled: true
        }
      ]);
    }
  }, [environment.uid, environment.variables, hasDraftForThisEnv, draft?.variables]);

  const savedValuesJson = useMemo(() => {
    return JSON.stringify((environment.variables || []).map(stripEnvVarUid));
  }, [environment.variables]);

  useEffect(() => {
    setPinnedData({ query: '', uids: new Set() });
  }, [savedValuesJson]);

  // Sync modified state
  useEffect(() => {
    const currentValues = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
    const currentValuesJson = JSON.stringify(currentValues.map(stripEnvVarUid));
    const hasActualChanges = currentValuesJson !== savedValuesJson;
    setIsModified(hasActualChanges);
  }, [formik.values, savedValuesJson, setIsModified]);

  // Sync draft state
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentValues = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
      const currentValuesJson = JSON.stringify(currentValues.map(stripEnvVarUid));
      const hasActualChanges = currentValuesJson !== savedValuesJson;

      const existingDraftVariables = hasDraftForThisEnv ? draft?.variables : null;
      const existingDraftJson = existingDraftVariables ? JSON.stringify(existingDraftVariables.map(stripEnvVarUid)) : null;

      if (hasActualChanges) {
        if (currentValuesJson !== existingDraftJson) {
          onDraftChange(currentValues);
        }
      } else if (hasDraftForThisEnv) {
        onDraftClear();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [formik.values, savedValuesJson, environment.uid, hasDraftForThisEnv, draft?.variables, onDraftChange, onDraftClear]);

  const ErrorMessage = ({ name, index }) => {
    const meta = formik.getFieldMeta(name);
    const id = `error-${name}-${index}`;

    const isLastRow = index === formik.values.length - 1;
    const variable = formik.values[index];
    const isEmptyRow = !variable?.name || variable.name.trim() === '';

    if (isLastRow && isEmptyRow) {
      return null;
    }

    if (!meta.error || !meta.touched) {
      return null;
    }
    return (
      <span>
        <IconAlertCircle id={id} className="text-red-600 cursor-pointer" size={20} />
        <Tooltip className="tooltip-mod" anchorId={id} html={meta.error || ''} />
      </span>
    );
  };

  const handleRemoveVar = useCallback(
    (id) => {
      const currentValues = formik.values;

      if (!currentValues || currentValues.length === 0) {
        return;
      }

      const lastRow = currentValues[currentValues.length - 1];
      const isLastEmptyRow = lastRow?.uid === id && (!lastRow.name || lastRow.name.trim() === '');

      if (isLastEmptyRow) {
        return;
      }

      const filteredValues = currentValues.filter((variable) => variable.uid !== id);

      const hasEmptyLastRow
        = filteredValues.length > 0
          && (!filteredValues[filteredValues.length - 1].name
            || filteredValues[filteredValues.length - 1].name.trim() === '');

      const newValues = hasEmptyLastRow
        ? filteredValues
        : [
            ...filteredValues,
            {
              uid: uuid(),
              name: '',
              value: '',
              type: 'text',
              secret: false,
              enabled: true
            }
          ];

      formik.setValues(newValues);
    },
    [formik.values]
  );

  const handleNameChange = (index, e) => {
    formik.handleChange(e);
    const isLastRow = index === formik.values.length - 1;

    if (isLastRow) {
      const newVariable = {
        uid: uuid(),
        name: '',
        value: '',
        type: 'text',
        secret: false,
        enabled: true
      };
      setTimeout(() => {
        formik.setFieldValue(formik.values.length, newVariable, false);
      }, 0);
    }
  };

  const handleNameBlur = (index) => {
    formik.setFieldTouched(`${index}.name`, true, true);
  };

  const handleNameKeyDown = (index, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      formik.setFieldTouched(`${index}.name`, true, true);
    }
  };

  const handleSave = useCallback(() => {
    const variablesToSave = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
    const savedValues = environment.variables || [];

    // Compare without UIDs since they can be different but the actual data is the same
    const hasChanges = JSON.stringify(variablesToSave.map(stripEnvVarUid)) !== JSON.stringify(savedValues.map(stripEnvVarUid));
    if (!hasChanges) {
      toast.error('No changes to save');
      return;
    }

    const hasValidationErrors = variablesToSave.some((variable) => {
      if (!variable.name || variable.name.trim() === '') {
        return true;
      }
      if (!variableNameRegex.test(variable.name)) {
        return true;
      }
      return false;
    });

    if (hasValidationErrors) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    onSave(cloneDeep(variablesToSave))
      .then(() => {
        toast.success('Changes saved successfully');
        onDraftClear();
        const newValues = [
          ...variablesToSave,
          {
            uid: uuid(),
            name: '',
            value: '',
            type: 'text',
            secret: false,
            enabled: true
          }
        ];
        formik.resetForm({ values: newValues });
        setIsModified(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error('An error occurred while saving the changes');
      });
  }, [formik.values, environment.variables, onSave, onDraftClear, setIsModified]);

  const handleReset = useCallback(() => {
    const originalVars = environment.variables || [];
    const resetValues = [
      ...originalVars,
      {
        uid: uuid(),
        name: '',
        value: '',
        type: 'text',
        secret: false,
        enabled: true
      }
    ];
    formik.resetForm({ values: resetValues });
    setIsModified(false);
  }, [environment.variables, setIsModified]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    const handleSaveEvent = () => {
      handleSaveRef.current();
    };

    window.addEventListener('environment-save', handleSaveEvent);

    return () => {
      window.removeEventListener('environment-save', handleSaveEvent);
    };
  }, []);

  const filteredVariables = useMemo(() => {
    const allVariables = formik.values.map((variable, index) => ({ variable, index }));
    if (!searchQuery?.trim()) {
      return allVariables;
    }

    const query = searchQuery.toLowerCase().trim();

    const effectivePins = pinnedData.query === searchQuery ? pinnedData.uids : new Set();
    return allVariables.filter(({ variable }) => {
      if (effectivePins.has(variable.uid)) return true;
      const nameMatch = variable.name ? variable.name.toLowerCase().includes(query) : false;
      const valueText
        = typeof variable.value === 'string'
          ? variable.value
          : typeof variable.value === 'number' || typeof variable.value === 'boolean'
            ? String(variable.value)
            : '';
      const valueMatch = valueText.toLowerCase().includes(query);
      return !!(nameMatch || valueMatch);
    });
  }, [formik.values, searchQuery, pinnedData]);

  const isSearchActive = !!searchQuery?.trim();

  return (
    <StyledWrapper className={resizing ? 'is-resizing' : ''}>
      {isSearchActive && filteredVariables.length === 0 ? (
        <div className="no-results">No results found for &ldquo;{searchQuery.trim()}&rdquo;</div>
      ) : (
        <TableVirtuoso
          className="table-container"
          style={{ height: tableHeight }}
          overscan={Math.min(30, filteredVariables.length)}
          components={{ TableRow }}
          data={filteredVariables}
          totalListHeightChanged={handleTotalHeightChanged}
          fixedHeaderContent={() => (
            <tr>
              <td className="text-center"></td>
              <td style={{ width: columnWidths.name }}>
                Name
                <div
                  className={`resize-handle ${resizing === 'name' ? 'resizing' : ''}`}
                  style={{ height: tableHeight > 0 ? `${tableHeight}px` : undefined }}
                  onMouseDown={(e) => handleResizeStart(e, 'name')}
                />
              </td>
              <td style={{ width: columnWidths.value }}>Value</td>
              <td className="text-center">Secret</td>
              <td></td>
            </tr>
          )}
          computeItemKey={(virtualIndex, item) => `${environment.uid}-${item.index}`}
          itemContent={(virtualIndex, { variable, index: actualIndex }) => {
            const isLastRow = actualIndex === formik.values.length - 1;
            const isEmptyRow = !variable.name || variable.name.trim() === '';
            const isLastEmptyRow = isLastRow && isEmptyRow;

            return (
              <>
                <td className="text-center">
                  {!isLastEmptyRow && (
                    <input
                      type="checkbox"
                      className="mousetrap"
                      name={`${actualIndex}.enabled`}
                      checked={variable.enabled}
                      onChange={formik.handleChange}
                    />
                  )}
                </td>
                <td style={{ width: columnWidths.name }}>
                  <div className="flex items-center">
                    <div className="name-cell-wrapper">
                      <input
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        className="mousetrap"
                        id={`${actualIndex}.name`}
                        name={`${actualIndex}.name`}
                        value={variable.name}
                        placeholder={!variable.name || (typeof variable.name === 'string' && variable.name.trim() === '') ? 'Name' : ''}
                        onChange={(e) => handleNameChange(actualIndex, e)}
                        onFocus={() => handleRowFocus(variable.uid)}
                        onBlur={() => {
                          handleNameBlur(actualIndex);
                        }}
                        onKeyDown={(e) => handleNameKeyDown(actualIndex, e)}
                      />
                    </div>
                    <ErrorMessage name={`${actualIndex}.name`} index={actualIndex} />
                  </div>
                </td>
                <td
                  className="flex flex-row flex-nowrap items-center"
                  style={{ width: columnWidths.value }}
                >
                  <div
                    className="overflow-hidden grow w-full relative"
                    onFocus={() => handleRowFocus(variable.uid)}
                  >
                    <MultiLineEditor
                      theme={storedTheme}
                      collection={_collection}
                      name={`${actualIndex}.value`}
                      value={variable.value}
                      placeholder={!variable.value || (typeof variable.value === 'string' && variable.value.trim() === '') ? 'Value' : ''}
                      isSecret={variable.secret}
                      readOnly={typeof variable.value !== 'string'}
                      onChange={(newValue) => {
                        formik.setFieldValue(`${actualIndex}.value`, newValue, true);
                        // Clear ephemeral metadata when user manually edits the value
                        if (variable.ephemeral) {
                          formik.setFieldValue(`${actualIndex}.ephemeral`, undefined, false);
                          formik.setFieldValue(`${actualIndex}.persistedValue`, undefined, false);
                        }
                        // Append a new empty row when editing value on the last row
                        if (isLastRow) {
                          setTimeout(() => {
                            formik.setFieldValue(formik.values.length, {
                              uid: uuid(),
                              name: '',
                              value: '',
                              type: 'text',
                              secret: false,
                              enabled: true
                            }, false);
                          }, 0);
                        }
                      }}
                      onSave={handleSave}
                    />
                  </div>
                  {typeof variable.value !== 'string' && (
                    <span className="ml-2 flex items-center">
                      <IconInfoCircle id={`${variable.uid}-disabled-info-icon`} className="text-muted" size={16} />
                      <Tooltip
                        anchorId={`${variable.uid}-disabled-info-icon`}
                        content="Non-string values set via scripts are read-only and can only be updated through scripts."
                        place="top"
                      />
                    </span>
                  )}
                  {renderExtraValueContent && renderExtraValueContent(variable)}
                </td>
                <td className="text-center">
                  {!isLastEmptyRow && (
                    <input
                      type="checkbox"
                      className="mousetrap"
                      name={`${actualIndex}.secret`}
                      checked={variable.secret}
                      onChange={formik.handleChange}
                    />
                  )}
                </td>
                <td>
                  {!isLastEmptyRow && (
                    <button onClick={() => handleRemoveVar(variable.uid)}>
                      <IconTrash strokeWidth={1.5} size={18} />
                    </button>
                  )}
                </td>
              </>
            );
          }}
        />
      )}

      {/* We should re-think of these buttons placement in component as we use TableVirtuoso which because of
      these buttons renders at some transition: height 0.1s ease` */}
      <div className="button-container">
        <div className="flex items-center">
          <button type="button" className="submit" onClick={handleSave} data-testid="save-env">
            Save
          </button>
          <button type="button" className="submit reset ml-2" onClick={handleReset} data-testid="reset-env">
            Reset
          </button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentVariablesTable;

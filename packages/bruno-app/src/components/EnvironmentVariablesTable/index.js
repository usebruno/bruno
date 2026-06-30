import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import { IconTrash, IconAlertCircle, IconInfoCircle } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import { useSelector, useDispatch } from 'react-redux';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import MultiLineEditor from 'components/MultiLineEditor/index';
import DataTypeSelector from 'components/DataTypeSelector';
import StyledWrapper from './StyledWrapper';
import { uuid } from 'utils/common';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { BRUNO_VARIABLE_DATATYPES, valueToString } from '@usebruno/common/utils';
import { variableNameRegex } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import { getGlobalEnvironmentVariables } from 'utils/collections';
import { stripEnvVarUid } from 'utils/environments';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

const MIN_H = 35 * 2;
const MIN_COLUMN_WIDTH = 80;
const MIN_ROW_HEIGHT = 35;

// Non-secret rows first, then secrets. The tabs save independently, so a stable
// order keeps the "modified" comparison accurate regardless of which tab saved last.
const orderVarsBySecret = (vars) => {
  const nonSecret = [];
  const secret = [];
  vars.forEach((v) => (v.secret ? secret : nonSecret).push(v));
  return [...nonSecret, ...secret];
};

const TableRow = React.memo(
  ({ children, item, style, ...rest }) => {
    const variable = item?.variable ?? item;
    return (
      <tr key={variable?.uid} style={style} {...rest} data-testid={`env-var-row-${variable?.name}`}>
        {children}
      </tr>
    );
  },
  (prevProps, nextProps) => {
    const prevUid = prevProps?.item?.variable?.uid ?? prevProps?.item?.uid;
    const nextUid = nextProps?.item?.variable?.uid ?? nextProps?.item?.uid;
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
  searchQuery = '',
  variableType = 'variables'
}) => {
  const isSecretTab = variableType === 'secrets';
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
  const [tableHeight, setTableHeight] = useState(rowCount * MIN_ROW_HEIGHT);

  const [scroll, setScroll] = usePersistedState({
    key: `persisted::${activeTabUid}::collection-envs-scroll-${environment.uid}`,
    default: 0
  });
  const scrollerRef = useRef(null);
  const [scrollerEl, setScrollerEl] = useState(null);
  scrollerRef.current = scrollerEl;
  const initialTopMostItemIndex = useRef(Math.max(0, Math.floor(scroll / MIN_ROW_HEIGHT))).current;
  useTrackScroll({ ref: scrollerRef, onChange: setScroll, initialValue: scroll, enabled: !!scrollerEl });

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

  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  const workspaceProcessEnvVariables = activeWorkspace?.processEnvVariables;
  // `_collection` flows into every row's MultiLineEditor as the variable-resolution
  // context. Without memoization, `cloneDeep(collection)` runs on every render —
  // and Formik triggers a re-render on every keystroke, so a single env edit
  // session can deep-clone the entire collection 100+ times. That's the
  // dominant cost behind the test-budget flake.
  const _collection = useMemo(() => {
    const c = collection ? cloneDeep(collection) : {};
    c.globalEnvironmentVariables = globalEnvironmentVariables;
    c.activeEnvironmentUid = environment.uid;
    if (!collection && workspaceProcessEnvVariables) {
      c.workspaceProcessEnvVariables = workspaceProcessEnvVariables;
    }
    return c;
  }, [collection, globalEnvironmentVariables, workspaceProcessEnvVariables, environment.uid]);

  // Reuse the previous initialValues when only uids changed but the content is
  // identical.
  const initialValuesRef = useRef(null);
  const initialValues = useMemo(() => {
    const vars = environment.variables || [];
    const next = [
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
    const prev = initialValuesRef.current;
    if (prev && isEqual(prev.map(stripEnvVarUid), next.map(stripEnvVarUid))) {
      return prev;
    }
    initialValuesRef.current = next;
    return next;
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
        value: Yup.mixed().nullable(),
        dataType: Yup.string().oneOf(BRUNO_VARIABLE_DATATYPES).nullable(),
        annotations: Yup.array().nullable()
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
          secret: isSecretTab,
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

  // Keep the trailing empty "add new" row's secret flag in sync with the active
  // tab, so typing into it creates a variable of the correct type. The empty row
  // is filtered out of save/draft, so this never affects persisted data.
  useEffect(() => {
    const lastIndex = formik.values.length - 1;
    const last = formik.values[lastIndex];
    const isEmpty = !last?.name || (typeof last.name === 'string' && last.name.trim() === '');
    if (last && isEmpty && !!last.secret !== isSecretTab) {
      formik.setFieldValue(`${lastIndex}.secret`, isSecretTab, false);
    }
  }, [isSecretTab, formik.values]);

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
              secret: isSecretTab,
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
      // Pin the newly-named row's secret flag to the active tab synchronously; the
      // passive sync effect runs after paint and is racy for fast input.
      formik.setFieldValue(`${index}.secret`, isSecretTab, false);

      const newVariable = {
        uid: uuid(),
        name: '',
        value: '',
        type: 'text',
        secret: isSecretTab,
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
    const belongsToActiveTab = (variable) => (isSecretTab ? !!variable.secret : !variable.secret);

    const namedValues = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
    const savedValues = environment.variables || [];

    // Save is scoped to the active tab. Only the active tab's rows are persisted; the
    // other tab keeps its last-saved rows so saving variables never touches secrets and
    // vice versa.
    const activeCurrent = namedValues.filter(belongsToActiveTab);
    const activeSaved = savedValues.filter(belongsToActiveTab);
    const otherCurrent = namedValues.filter((variable) => !belongsToActiveTab(variable));
    const otherSaved = savedValues.filter((variable) => !belongsToActiveTab(variable));

    const hasChanges = JSON.stringify(activeCurrent.map(stripEnvVarUid)) !== JSON.stringify(activeSaved.map(stripEnvVarUid));
    if (!hasChanges) {
      toast.error('No changes to save');
      return;
    }

    const hasValidationErrors = activeCurrent.some((variable) => {
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

    // Persist the active tab's edits alongside the other tab's last-saved rows (unchanged).
    const persistedVariables = orderVarsBySecret([...activeCurrent, ...otherSaved]);

    onSave(cloneDeep(persistedVariables))
      .then(() => {
        toast.success('Changes saved successfully');

        // Preserve unsaved edits on the other tab across the post-save reinit via the
        // draft: keep it if the other tab is still dirty, clear it otherwise.
        const otherDirty
          = JSON.stringify(otherCurrent.map(stripEnvVarUid)) !== JSON.stringify(otherSaved.map(stripEnvVarUid));
        const retainedVariables = orderVarsBySecret([...activeCurrent, ...otherCurrent]);

        if (otherDirty) {
          onDraftChange(cloneDeep(retainedVariables));
        } else {
          onDraftClear();
        }

        formik.resetForm({
          values: [
            ...retainedVariables,
            {
              uid: uuid(),
              name: '',
              value: '',
              type: 'text',
              secret: isSecretTab,
              enabled: true
            }
          ]
        });
        setIsModified(otherDirty);
      })
      .catch((error) => {
        console.error(error);
        toast.error('An error occurred while saving the changes');
      });
  }, [formik.values, environment.variables, onSave, onDraftChange, onDraftClear, setIsModified, isSecretTab]);

  const handleReset = useCallback(() => {
    const belongsToActiveTab = (variable) => (isSecretTab ? !!variable.secret : !variable.secret);

    const savedValues = environment.variables || [];
    const activeSaved = savedValues.filter(belongsToActiveTab);
    const otherSaved = savedValues.filter((variable) => !belongsToActiveTab(variable));
    const otherCurrent = formik.values
      .filter((variable) => variable.name && variable.name.trim() !== '')
      .filter((variable) => !belongsToActiveTab(variable));

    // Reset is scoped to the active tab: revert its rows to the saved baseline while
    // leaving the other tab's current (possibly unsaved) edits intact.
    const resetVariables = orderVarsBySecret([...activeSaved, ...otherCurrent]);

    const otherDirty
      = JSON.stringify(otherCurrent.map(stripEnvVarUid)) !== JSON.stringify(otherSaved.map(stripEnvVarUid));

    if (otherDirty) {
      onDraftChange(cloneDeep(resetVariables));
    } else {
      onDraftClear();
    }

    formik.resetForm({
      values: [
        ...resetVariables,
        {
          uid: uuid(),
          name: '',
          value: '',
          type: 'text',
          secret: isSecretTab,
          enabled: true
        }
      ]
    });
    setIsModified(otherDirty);
  }, [environment.variables, formik.values, isSecretTab, onDraftChange, onDraftClear, setIsModified]);

  const handleSaveAll = useCallback(() => {
    const namedValues = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
    const savedValues = environment.variables || [];

    const persistedVariables = orderVarsBySecret(namedValues);

    const hasChanges
      = JSON.stringify(persistedVariables.map(stripEnvVarUid)) !== JSON.stringify(savedValues.map(stripEnvVarUid));
    if (!hasChanges) {
      toast.error('No changes to save');
      return;
    }

    const hasValidationErrors = namedValues.some((variable) => {
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

    onSave(cloneDeep(persistedVariables))
      .then(() => {
        toast.success('Changes saved successfully');
        onDraftClear();

        formik.resetForm({
          values: [
            ...persistedVariables,
            {
              uid: uuid(),
              name: '',
              value: '',
              type: 'text',
              secret: isSecretTab,
              enabled: true
            }
          ]
        });
        setIsModified(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error('An error occurred while saving the changes');
      });
  }, [formik.values, environment.variables, onSave, onDraftClear, setIsModified, isSecretTab]);

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;
  const handleSaveAllRef = useRef(handleSaveAll);
  handleSaveAllRef.current = handleSaveAll;

  useEffect(() => {
    const handleSaveEvent = () => {
      handleSaveRef.current();
    };
    const handleSaveAllEvent = () => {
      handleSaveAllRef.current();
    };

    window.addEventListener('environment-save', handleSaveEvent);
    window.addEventListener('environment-save-all', handleSaveAllEvent);

    return () => {
      window.removeEventListener('environment-save', handleSaveEvent);
      window.removeEventListener('environment-save-all', handleSaveAllEvent);
    };
  }, []);

  const filteredVariables = useMemo(() => {
    const lastIndex = formik.values.length - 1;
    // Show only rows belonging to the active tab, but always keep the trailing
    // empty "add new" row so the user can add a variable/secret on either tab.
    const tabVariables = formik.values
      .map((variable, index) => ({ variable, index }))
      .filter(({ variable, index }) => {
        const isLastEmptyRow
          = index === lastIndex && (!variable.name || (typeof variable.name === 'string' && variable.name.trim() === ''));
        if (isLastEmptyRow) return true;
        return isSecretTab ? !!variable.secret : !variable.secret;
      });

    if (!searchQuery?.trim()) {
      return tabVariables;
    }

    const query = searchQuery.toLowerCase().trim();

    const effectivePins = pinnedData.query === searchQuery ? pinnedData.uids : new Set();
    return tabVariables.filter(({ variable }) => {
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
  }, [formik.values, searchQuery, pinnedData, isSecretTab]);

  const isSearchActive = !!searchQuery?.trim();

  return (
    <StyledWrapper className={resizing ? 'is-resizing' : ''}>
      {isSearchActive && filteredVariables.length === 0 ? (
        <div className="no-results">No results found for &ldquo;{searchQuery.trim()}&rdquo;</div>
      ) : (
        <TableVirtuoso
          className="table-container"
          style={{ height: tableHeight }}
          scrollerRef={setScrollerEl}
          initialTopMostItemIndex={initialTopMostItemIndex}
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
              <td></td>
            </tr>
          )}
          defaultItemHeight={35}
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
                  className="flex flex-row flex-nowrap items-center gap-2"
                  style={{ width: columnWidths.value }}
                >
                  <div
                    className="flex-1 min-w-0 relative"
                    onFocus={() => handleRowFocus(variable.uid)}
                  >
                    <MultiLineEditor
                      theme={storedTheme}
                      collection={_collection}
                      name={`${actualIndex}.value`}
                      value={valueToString(variable.value, 2)}
                      placeholder={variable.value == null || (typeof variable.value === 'string' && variable.value.trim() === '') ? 'Value' : ''}
                      isSecret={variable.secret}
                      onChange={(newValue) => {
                        formik.setFieldValue(`${actualIndex}.value`, newValue, true);
                        // Append a new empty row when editing value on the last row
                        if (isLastRow) {
                          setTimeout(() => {
                            formik.setFieldValue(formik.values.length, {
                              uid: uuid(),
                              name: '',
                              value: '',
                              type: 'text',
                              secret: isSecretTab,
                              enabled: true
                            }, false);
                          }, 0);
                        }
                      }}
                      onSave={handleSave}
                    />
                  </div>
                  {!isLastEmptyRow && (
                    <span>
                      <DataTypeSelector
                        variable={variable}
                        theme={storedTheme}
                        collection={_collection}
                        onChange={(fields) => {
                          Object.entries(fields).forEach(([key, val]) => {
                            formik.setFieldValue(`${actualIndex}.${key}`, val, true);
                          });
                        }}
                      />
                    </span>
                  )}
                  {renderExtraValueContent && renderExtraValueContent(variable)}
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

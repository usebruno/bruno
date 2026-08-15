import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  useMemo
} from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import cloneDeep from 'lodash/cloneDeep';
import isEqual from 'lodash/isEqual';
import {
  IconTrash,
  IconAlertCircle,
  IconInfoCircle,
  IconGripVertical,
  IconMinusVertical
} from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import { useSelector, useDispatch } from 'react-redux';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import MultiLineEditor from 'components/MultiLineEditor/index';
import SecretEyeButton from 'components/MultiLineEditor/SecretEyeButton';
import DataTypeSelector from 'components/DataTypeSelector';
import VarValueCell from 'components/VarValueCell';
import StyledWrapper from './StyledWrapper';
import { uuid } from 'utils/common';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  BRUNO_VARIABLE_DATATYPES,
  valueToString
} from '@usebruno/common/utils';
import { variableNameRegex } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import { getGlobalEnvironmentVariables } from 'utils/collections';
import {
  stripEnvVarUid,
  getDuplicateSecretNames,
  DUPLICATE_SECRET_NAMES_ERROR,
  DUPLICATE_SECRET_NAME_FIELD_ERROR
} from 'utils/environments';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import { useSortCycle } from 'hooks/useSortCycle';
import { sortRowsByName, reorderWithinSubset } from 'utils/sortableRows';
import { useMouseRowDrag, DRAG_ROW_KEY_ATTR } from 'hooks/useMouseRowDrag';
import ColumnSortHeader from 'components/EditableTable/ColumnSortHeader';
import { reconcileSavedChange } from './reconcile';

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
  ({ children, item, style, context, ...rest }) => {
    const variable = item?.variable ?? item;
    const canDrag
      = !!context?.dragEnabled && item?.index !== context?.lastFormikIndex;
    const isDragOver = canDrag && context?.dragOverKey === variable?.uid;
    const isBeingDragged = canDrag && context?.draggingKey === variable?.uid;

    return (
      <tr
        key={variable?.uid}
        style={style}
        {...rest}
        className={`${rest.className || ''} ${isDragOver ? 'drag-over' : ''} ${
          isBeingDragged ? 'dragging-source' : ''
        }`.trim()}
        data-testid={`env-var-row-${variable?.name}`}
        {...(canDrag ? { [DRAG_ROW_KEY_ATTR]: variable.uid } : {})}
      >
        {children}
      </tr>
    );
  },
  (prevProps, nextProps) => {
    const prevVar = prevProps?.item?.variable ?? prevProps?.item;
    const nextVar = nextProps?.item?.variable ?? nextProps?.item;
    const prevCtx = prevProps.context || {};
    const nextCtx = nextProps.context || {};
    return (
      prevVar === nextVar
      && prevProps.item?.index === nextProps.item?.index
      && prevCtx.dragEnabled === nextCtx.dragEnabled
      && prevCtx.dragOverKey === nextCtx.dragOverKey
      && prevCtx.draggingKey === nextCtx.draggingKey
      && prevCtx.duplicateSecretNames === nextCtx.duplicateSecretNames
    );
  }
);

const columns = ['name', 'value', 'description'];

const EnvVarValueCell = React.memo(
  ({
    variable,
    actualIndex,
    isLastRow,
    isLastEmptyRow,
    storedTheme,
    collection,
    formik,
    handleRowFocus,
    handleSave,
    renderExtraValueContent
  }) => {
    const editorRef = useRef(null);
    const [compact, setCompact] = useState(true);

    const showAsSecret = variable.secret && !isLastEmptyRow;
    const [masked, setMasked] = useState(showAsSecret);

    useEffect(() => {
      setMasked(showAsSecret);
    }, [showAsSecret]);

    return (
      <VarValueCell
        onCompactChange={setCompact}
        trailingContent={
          showAsSecret ? (
            <SecretEyeButton
              masked={masked}
              testId="secret-reveal-toggle"
              onToggle={() => editorRef.current?.toggleVisibleSecret()}
            />
          ) : null
        }
        editor={(
          <div
            className="flex items-center"
            onFocus={() => handleRowFocus(variable.uid)}
          >
            {renderExtraValueContent && renderExtraValueContent(variable)}
            <MultiLineEditor
              ref={editorRef}
              theme={storedTheme}
              collection={collection}
              name={`${actualIndex}.value`}
              value={valueToString(variable.value, 2)}
              placeholder={
                variable.value == null
                || (typeof variable.value === 'string'
                  && variable.value.trim() === '')
                  ? 'Value'
                  : ''
              }
              isSecret={showAsSecret}
              hideSecretEye={showAsSecret}
              onMaskChange={setMasked}
              onChange={(newValue) => {
                formik.setFieldValue(`${actualIndex}.value`, newValue, true);
                if (variable.ephemeral) {
                  formik.setFieldValue(
                    `${actualIndex}.ephemeral`,
                    undefined,
                    false
                  );
                  formik.setFieldValue(
                    `${actualIndex}.persistedValue`,
                    undefined,
                    false
                  );
                }
                if (isLastRow) {
                  setTimeout(() => {
                    formik.setFieldValue(
                      formik.values.length,
                      {
                        uid: uuid(),
                        name: '',
                        value: '',
                        description: '',
                        type: 'text',
                        secret: false,
                        enabled: true
                      },
                      false
                    );
                  }, 0);
                }
              }}
              onSave={handleSave}
            />
          </div>
        )}
        renderTypeSelector={
          !isLastEmptyRow
            ? ({ compact: isCompact }) => (
                <DataTypeSelector
                  compact={isCompact}
                  variable={variable}
                  collection={collection}
                  onChange={(fields) => {
                    Object.entries(fields).forEach(([key, val]) => {
                      formik.setFieldValue(`${actualIndex}.${key}`, val, true);
                    });
                  }}
                />
              )
            : null
        }
      />
    );
  },
  (prev, next) => {
    return (
      prev.variable?.value === next.variable?.value
      && prev.variable?.secret === next.variable?.secret
      && prev.variable?.dataType === next.variable?.dataType
      && prev.variable?.uid === next.variable?.uid
      && prev.variable?.ephemeral === next.variable?.ephemeral
      && prev.actualIndex === next.actualIndex
      && prev.isLastRow === next.isLastRow
      && prev.isLastEmptyRow === next.isLastEmptyRow
      && prev.storedTheme === next.storedTheme
      && prev.collection === next.collection
    );
  }
);

const EnvVarDescriptionCell = React.memo(
  ({
    description,
    actualIndex,
    isLastRow,
    isLastEmptyRow,
    isSecretTab,
    storedTheme,
    collection,
    formik,
    handleSave
  }) => {
    return (
      <MultiLineEditor
        theme={storedTheme}
        collection={collection}
        name={`${actualIndex}.description`}
        value={description ?? ''}
        placeholder={
          isLastEmptyRow
          && (!description
            || (typeof description === 'string' && description.trim() === ''))
            ? 'Description'
            : ''
        }
        onChange={(newValue) => {
          formik.setFieldValue(`${actualIndex}.description`, newValue, true);
          if (isLastRow) {
            setTimeout(() => {
              formik.setFieldValue(
                formik.values.length,
                {
                  uid: uuid(),
                  name: '',
                  value: '',
                  type: 'text',
                  secret: isSecretTab,
                  enabled: true,
                  description: ''
                },
                false
              );
            }, 0);
          }
        }}
        onSave={handleSave}
      />
    );
  },
  (prev, next) => {
    return (
      prev.description === next.description
      && prev.actualIndex === next.actualIndex
      && prev.isLastRow === next.isLastRow
      && prev.isLastEmptyRow === next.isLastEmptyRow
      && prev.isSecretTab === next.isSecretTab
      && prev.storedTheme === next.storedTheme
      && prev.collection === next.collection
    );
  }
);

const ErrorMessage = React.memo(({ name, index, error }) => {
  const id = `error-${name}-${index}`;

  if (!error) {
    return null;
  }
  return (
    <span>
      <IconAlertCircle
        id={id}
        data-testid="env-var-name-error"
        className="text-red-600 cursor-pointer"
        size={20}
      />
      <Tooltip className="tooltip-mod" anchorId={id} html={error} />
    </span>
  );
});

const EnvVarRow = React.memo(
  ({
    virtualIndex,
    variable,
    actualIndex,
    isLastRow,
    isEmptyRow,
    isLastEmptyRow,
    dragEnabled,
    columnWidths,
    isSecretTab,
    storedTheme,
    collection,
    rowError,
    formik,
    handleRowFocus,
    handleSave,
    handleNameChange,
    handleNameBlur,
    handleNameKeyDown,
    handleRemoveVar,
    handleDragHandleMouseDown,
    renderExtraValueContent
  }) => {
    return (
      <>
        <td className="text-center relative">
          {dragEnabled && !isLastEmptyRow && (
            <div
              data-testid="drag-handle"
              className="drag-handle group absolute z-10 left-[-8px] top-1/2 -translate-y-1/2 p-1 cursor-grab"
              onMouseDown={(e) =>
                handleDragHandleMouseDown(e, variable.uid, variable.name)}
            >
              <IconGripVertical
                size={14}
                className="icon-grip hidden group-hover:block"
              />
              <IconMinusVertical
                size={14}
                className="icon-minus block group-hover:hidden"
              />
            </div>
          )}
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
                data-testid="env-var-name-input"
                value={variable.name}
                placeholder={
                  !variable.name
                  || (typeof variable.name === 'string'
                    && variable.name.trim() === '')
                    ? 'Name'
                    : ''
                }
                onChange={(e) => handleNameChange(actualIndex, e)}
                onFocus={() => handleRowFocus(variable.uid)}
                onBlur={() => {
                  handleNameBlur(actualIndex);
                }}
                onKeyDown={(e) => {
                  handleNameKeyDown(actualIndex, e);
                }}
              />
            </div>
            <ErrorMessage
              name={`${actualIndex}.name`}
              index={actualIndex}
              error={rowError}
            />
          </div>
        </td>
        <td style={{ width: columnWidths.value }} className="overflow-hidden">
          <EnvVarValueCell
            variable={variable}
            actualIndex={actualIndex}
            isLastRow={isLastRow}
            isLastEmptyRow={isLastEmptyRow}
            isSecretTab={isSecretTab}
            storedTheme={storedTheme}
            collection={collection}
            formik={formik}
            handleRowFocus={handleRowFocus}
            handleSave={handleSave}
            renderExtraValueContent={renderExtraValueContent}
          />
        </td>
        <td style={{ width: columnWidths.description }}>
          <EnvVarDescriptionCell
            description={variable.description}
            actualIndex={actualIndex}
            isLastRow={isLastRow}
            isLastEmptyRow={isLastEmptyRow}
            isSecretTab={isSecretTab}
            storedTheme={storedTheme}
            collection={collection}
            formik={formik}
            handleSave={handleSave}
          />
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
  },
  (prev, next) => {
    return (
      prev.variable === next.variable
      && prev.actualIndex === next.actualIndex
      && prev.isLastRow === next.isLastRow
      && prev.isEmptyRow === next.isEmptyRow
      && prev.isLastEmptyRow === next.isLastEmptyRow
      && prev.dragEnabled === next.dragEnabled
      && prev.columnWidths === next.columnWidths
      && prev.storedTheme === next.storedTheme
      && prev.collection === next.collection
      && prev.isSecretTab === next.isSecretTab
      && prev.rowError === next.rowError
    );
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
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector(
    (state) => state.globalEnvironments
  );
  const activeWorkspace = useSelector((state) => {
    const uid = state.workspaces?.activeWorkspaceUid;
    return state.workspaces?.workspaces?.find((w) => w.uid === uid);
  });

  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  const hasDraftForThisEnv = draft?.environmentUid === environment.uid;

  const rowCount = (environment.variables?.length || 0) + 1;
  const [tableHeight, setTableHeight] = useState(
    Math.max(rowCount * MIN_ROW_HEIGHT, MIN_H)
  );

  const [scroll, setScroll] = usePersistedState({
    key: `persisted::${activeTabUid}::collection-envs-scroll-${environment.uid}`,
    default: 0
  });
  const scrollerRef = useRef(null);
  const [scrollerEl, setScrollerEl] = useState(null);
  scrollerRef.current = scrollerEl;
  const initialTopMostItemIndex = useRef(
    Math.max(0, Math.floor(scroll / MIN_ROW_HEIGHT))
  ).current;
  useTrackScroll({
    ref: scrollerRef,
    onChange: setScroll,
    initialValue: scroll,
    enabled: !!scrollerEl
  });

  // Use environment UID as part of tableId so each environment has its own column widths
  const tableId = `env-vars-table-${environment.uid}`;

  // Get column widths from Redux - derived value (not state)
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const storedColumnWidths = focusedTab?.tableColumnWidths?.[tableId];

  // Local state initialized from Redux (computed once on mount/environment change via key)
  const [columnWidths, setColumnWidths] = useState(() => {
    return (
      storedColumnWidths || { name: '20%', value: 'auto', description: '35%' }
    );
  });

  const [resizing, setResizing] = useState(null);
  const [pinnedData, setPinnedData] = useState({ query: '', uids: new Set() });
  const isSearchActive = !!searchQuery?.trim();

  const variablesSort = useSortCycle({
    storageKey: `persisted::${activeTabUid}::env-var-sort::${environment.uid}::variables`
  });
  const secretsSort = useSortCycle({
    storageKey: `persisted::${activeTabUid}::env-var-sort::${environment.uid}::secrets`
  });
  const { sortMode, cycleSortMode, SortIcon, sortLabel } = isSecretTab
    ? secretsSort
    : variablesSort;
  const dragEnabled = sortMode === 'default' && !isSearchActive;

  const handleColumnWidthsChange = (id, widths) => {
    dispatch(
      updateTableColumnWidths({ uid: activeTabUid, tableId: id, widths })
    );
  };

  // Store column widths in ref for access in event handlers
  const columnWidthsRef = useRef(columnWidths);
  columnWidthsRef.current = columnWidths;

  const handleResizeStart = useCallback(
    (e, columnKey) => {
      e.preventDefault();
      e.stopPropagation();

      const currentCell = e.target.closest('td');
      const nextCell = currentCell?.nextElementSibling;
      if (!currentCell || !nextCell) return;

      const startX = e.clientX;
      const startWidth = currentCell.offsetWidth;

      const columnIndex = columns.indexOf(columnKey);
      if (columnIndex < 0) return;

      const nextColumnKey = columns[columnIndex + 1];
      if (!nextColumnKey) return;

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
    },
    [handleColumnWidthsChange]
  );

  const handleTotalHeightChanged = useCallback((h) => {
    setTableHeight(Math.max(h, MIN_H));
  }, []);

  const handleRowFocus = useCallback(
    (uid) => {
      setPinnedData((prev) => ({
        query: searchQuery,
        uids:
          prev.query === searchQuery
            ? new Set([...prev.uids, uid])
            : new Set([uid])
      }));
    },
    [searchQuery]
  );

  const prevEnvUidRef = useRef(null);
  const mountedRef = useRef(false);
  const pendingDraftRestoreRef = useRef(false);

  const globalEnvironmentVariables = useMemo(() => {
    return getGlobalEnvironmentVariables({
      globalEnvironments,
      activeGlobalEnvironmentUid
    });
  }, [globalEnvironments, activeGlobalEnvironmentUid]);
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
  }, [
    collection,
    globalEnvironmentVariables,
    workspaceProcessEnvVariables,
    environment.uid
  ]);

  // Reuse the previous initialValues when only uids changed but the content is
  // identical.
  const initialValuesRef = useRef(null);
  const initialValues = useMemo(() => {
    const vars = environment.variables || [];
    const next = [
      ...vars.map((v) => ({ ...v, description: v.description ?? '' })),
      {
        uid: uuid(),
        name: '',
        value: '',
        type: 'text',
        secret: false,
        enabled: true,
        description: ''
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
    // enableReinitialize is intentionally OFF. It used to blindly reset the form
    // to `environment.variables` whenever the saved snapshot changed — including
    // when our own autosave echoed back — which discarded keystrokes typed during
    // the async save window. Reconciliation is handled explicitly below (see the
    // reconcileSavedChange effect), so in-flight edits always win. Environment
    // switches are handled by the `key={environment.uid}` remount, not reinit.
    enableReinitialize: false,
    initialValues: initialValues,
    validateOnChange: false,
    validateOnBlur: false,
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
        description: Yup.string().nullable(),
        dataType: Yup.string().oneOf(BRUNO_VARIABLE_DATATYPES).nullable(),
        annotations: Yup.array().nullable()
      })
    ),
    validate: (values) => {
      const errors = {};
      const duplicateSecrets = getDuplicateSecretNames(values);
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
        } else if (
          variable.secret
          && duplicateSecrets.has(variable.name.trim())
        ) {
          if (!errors[index]) errors[index] = {};
          errors[index].name = DUPLICATE_SECRET_NAME_FIELD_ERROR;
        }
      });
      return Object.keys(errors).length > 0 ? errors : {};
    },
    onSubmit: () => {}
  });

  const valuesRef = useRef(formik.values);
  valuesRef.current = formik.values;
  const formikRef = useRef(formik);
  formikRef.current = formik;

  const buildSortOrder = useCallback(
    (variables, mode) => {
      if (mode === 'default') return null;
      const activeTabVars = variables.filter(
        (v) => !!v.secret === isSecretTab && v.name && v.name.trim() !== ''
      );
      return sortRowsByName(activeTabVars, mode, (v) => v.name).map(
        (v) => v.uid
      );
    },
    [isSecretTab]
  );

  const sortOrderRef = useRef(null);
  const prevSortModeRef = useRef();
  const prevIsSecretTabRef = useRef(isSecretTab);
  const prevIsDraftRef = useRef(hasDraftForThisEnv);
  const prevEnvironmentVariablesRef = useRef(environment.variables);
  const justCommitted
    = prevIsDraftRef.current === true && hasDraftForThisEnv === false;
  const savedVariablesChanged
    = prevEnvironmentVariablesRef.current !== environment.variables;
  const tabChanged = prevIsSecretTabRef.current !== isSecretTab;
  prevIsSecretTabRef.current = isSecretTab;
  prevIsDraftRef.current = hasDraftForThisEnv;
  prevEnvironmentVariablesRef.current = environment.variables;
  if (
    prevSortModeRef.current !== sortMode
    || tabChanged
    || justCommitted
    || savedVariablesChanged
  ) {
    prevSortModeRef.current = sortMode;
    // After a save/reparse, `environment.variables` gets new uids; `initialValues` keeps stable ones for reorder.
    sortOrderRef.current = buildSortOrder(
      savedVariablesChanged ? initialValues : formik.values,
      sortMode
    );
  }

  const handleRowReorder = useCallback(
    (fromUid, toUid) => {
      const currentValues = valuesRef.current;
      const belongsToActiveTab = (variable) =>
        !!variable.secret === isSecretTab;
      const reordered = reorderWithinSubset(
        currentValues,
        belongsToActiveTab,
        fromUid,
        toUid
      );
      if (reordered !== currentValues) {
        formikRef.current.setValues(reordered);
      }
    },
    [isSecretTab]
  );

  const { draggingKey, dragOverKey, handleDragHandleMouseDown, cancelDrag }
    = useMouseRowDrag({
      enabled: dragEnabled,
      onReorder: handleRowReorder
    });

  useEffect(() => {
    cancelDrag();
  }, [variableType, cancelDrag]);

  const prevDuplicateSecretNamesRef = useRef(new Set());
  const duplicateSecretNames = useMemo(() => {
    const nextSet = getDuplicateSecretNames(formik.values);
    const prevSet = prevDuplicateSecretNamesRef.current;
    if (
      prevSet.size === nextSet.size
      && [...prevSet].every((name) => nextSet.has(name))
    ) {
      return prevSet;
    }
    prevDuplicateSecretNamesRef.current = nextSet;
    return nextSet;
  }, [formik.values]);

  const dragContext = useMemo(
    () => ({
      dragEnabled,
      dragOverKey,
      draggingKey,
      lastFormikIndex: formik.values.length - 1,
      duplicateSecretNames
    }),
    [
      dragEnabled,
      dragOverKey,
      draggingKey,
      formik.values.length,
      duplicateSecretNames
    ]
  );

  // Restore draft values on mount or environment switch (not on external filesystem reloads)
  useEffect(() => {
    const isMount = !mountedRef.current;
    const envChanged
      = prevEnvUidRef.current !== null
        && prevEnvUidRef.current !== environment.uid;

    prevEnvUidRef.current = environment.uid;
    mountedRef.current = true;

    if (
      (isMount || envChanged || pendingDraftRestoreRef.current)
      && hasDraftForThisEnv
      && draft?.variables
    ) {
      pendingDraftRestoreRef.current = false;
      formik.setValues([
        ...draft.variables.map((v) => ({
          ...v,
          description: v.description ?? ''
        })),
        {
          uid: uuid(),
          name: '',
          value: '',
          type: 'text',
          secret: isSecretTab,
          enabled: true,
          description: ''
        }
      ]);
    }
  }, [environment.uid, hasDraftForThisEnv, draft?.variables]);

  const savedValuesJson = useMemo(() => {
    return JSON.stringify((environment.variables || []).map(stripEnvVarUid));
  }, [environment.variables]);

  // Controlled replacement for enableReinitialize. When the persisted snapshot
  // changes (autosave echo, script env update, external file reload, or an edit
  // made outside the table) adopt it ONLY if the form has no unsaved edits.
  // If the user is typing ahead, keep their edits — the draft/autosave cycle
  // persists them — so nothing typed during an async save is lost.
  const prevSavedValuesJsonRef = useRef(savedValuesJson);
  useEffect(() => {
    const prevSaved = prevSavedValuesJsonRef.current;
    prevSavedValuesJsonRef.current = savedValuesJson;

    const currentNamed = formik.values.filter(
      (variable) => variable.name && variable.name.trim() !== ''
    );
    const currentJson = JSON.stringify(currentNamed.map(stripEnvVarUid));

    if (
      reconcileSavedChange({
        prevSaved,
        nextSaved: savedValuesJson,
        current: currentJson
      }) === 'adopt'
    ) {
      formik.resetForm({ values: initialValues });
    }
  }, [savedValuesJson]);

  useEffect(() => {
    setPinnedData({ query: '', uids: new Set() });
  }, [savedValuesJson]);

  // Sync modified state
  useEffect(() => {
    const currentValues = formik.values.filter(
      (variable) => variable.name && variable.name.trim() !== ''
    );
    const currentValuesJson = JSON.stringify(currentValues.map(stripEnvVarUid));
    const hasActualChanges = currentValuesJson !== savedValuesJson;
    setIsModified(hasActualChanges);
  }, [formik.values, savedValuesJson, setIsModified]);

  // Sync draft state
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentValues = formik.values.filter(
        (variable) => variable.name && variable.name.trim() !== ''
      );
      const currentValuesJson = JSON.stringify(
        currentValues.map(stripEnvVarUid)
      );
      const hasActualChanges = currentValuesJson !== savedValuesJson;

      const existingDraftVariables = hasDraftForThisEnv
        ? draft?.variables
        : null;
      const existingDraftJson = existingDraftVariables
        ? JSON.stringify(existingDraftVariables.map(stripEnvVarUid))
        : null;

      if (hasActualChanges) {
        if (currentValuesJson !== existingDraftJson) {
          onDraftChange(currentValues);
        }
      } else if (hasDraftForThisEnv) {
        onDraftClear();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    formik.values,
    savedValuesJson,
    environment.uid,
    hasDraftForThisEnv,
    draft?.variables,
    onDraftChange,
    onDraftClear
  ]);

  const getRowError = (variable, index) => {
    const isLastRow = index === formik.values.length - 1;
    const isEmptyRow = !variable?.name || variable.name.trim() === '';

    if (isLastRow && isEmptyRow) {
      return null;
    }

    if (!variable?.name || variable.name.trim() === '') {
      return 'Name cannot be empty';
    }

    if (!variableNameRegex.test(variable.name)) {
      return 'Name contains invalid characters. Must only contain alphanumeric characters, "-", "_", "." and cannot start with a digit.';
    }

    if (variable.secret && duplicateSecretNames.has(variable.name.trim())) {
      return DUPLICATE_SECRET_NAME_FIELD_ERROR;
    }

    return null;
  };

  const handleRemoveVar = useCallback(
    (id) => {
      const currentValues = valuesRef.current;

      if (!currentValues || currentValues.length === 0) {
        return;
      }

      const lastRow = currentValues[currentValues.length - 1];
      const isLastEmptyRow
        = lastRow?.uid === id && (!lastRow.name || lastRow.name.trim() === '');

      if (isLastEmptyRow) {
        return;
      }

      const filteredValues = currentValues.filter(
        (variable) => variable.uid !== id
      );

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
              enabled: true,
              description: ''
            }
          ];

      formikRef.current.setValues(newValues);
    },
    [isSecretTab]
  );

  const handleNameChange = useCallback(
    (index, e) => {
      const newName = e.target.value;
      const currentValues = valuesRef.current;
      const isLastRow = index === currentValues.length - 1;

      if (isLastRow && newName.trim() !== '') {
        const newValues = [...currentValues];
        newValues[index] = {
          ...newValues[index],
          name: newName,
          secret: isSecretTab
        };
        newValues.push({
          uid: uuid(),
          name: '',
          value: '',
          type: 'text',
          secret: isSecretTab,
          enabled: true,
          description: ''
        });
        formikRef.current.setValues(newValues);
      } else {
        formikRef.current.setFieldValue(`${index}.name`, newName, false);
      }
    },
    [isSecretTab]
  );

  const handleNameBlur = useCallback((index) => {}, []);

  const handleNameKeyDown = useCallback((index, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  }, []);

  const handleSave = useCallback(() => {
    const belongsToActiveTab = (variable) =>
      isSecretTab ? !!variable.secret : !variable.secret;

    const namedValues = formik.values.filter(
      (variable) => variable.name && variable.name.trim() !== ''
    );
    const savedValues = environment.variables || [];

    // Save is scoped to the active tab. Only the active tab's rows are persisted; the
    // other tab keeps its last-saved rows so saving variables never touches secrets and
    // vice versa.
    const activeCurrent = namedValues.filter(belongsToActiveTab);
    const activeSaved = savedValues.filter(belongsToActiveTab);
    const otherCurrent = namedValues.filter(
      (variable) => !belongsToActiveTab(variable)
    );
    const otherSaved = savedValues.filter(
      (variable) => !belongsToActiveTab(variable)
    );

    const hasChanges
      = JSON.stringify(activeCurrent.map(stripEnvVarUid))
        !== JSON.stringify(activeSaved.map(stripEnvVarUid));
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

    if (getDuplicateSecretNames(activeCurrent).size > 0) {
      toast.error(DUPLICATE_SECRET_NAMES_ERROR);
      return;
    }

    // Persist the active tab's edits alongside the other tab's last-saved rows (unchanged).
    const persistedVariables = orderVarsBySecret([
      ...activeCurrent,
      ...otherSaved
    ]);

    onSave(cloneDeep(persistedVariables))
      .then(() => {
        toast.success('Changes saved successfully');

        // Preserve unsaved edits on the other tab across the post-save reinit via the
        // draft: keep it if the other tab is still dirty, clear it otherwise.
        const otherDirty
          = JSON.stringify(otherCurrent.map(stripEnvVarUid))
            !== JSON.stringify(otherSaved.map(stripEnvVarUid));
        const retainedVariables = orderVarsBySecret([
          ...activeCurrent,
          ...otherCurrent
        ]);

        if (otherDirty) {
          onDraftChange(cloneDeep(retainedVariables));
          pendingDraftRestoreRef.current = true;
        } else {
          onDraftClear();
        }

        sortOrderRef.current = buildSortOrder(retainedVariables, sortMode);

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
  }, [
    formik.values,
    environment.variables,
    onSave,
    onDraftChange,
    onDraftClear,
    setIsModified,
    isSecretTab,
    buildSortOrder,
    sortMode
  ]);

  const handleReset = useCallback(() => {
    const belongsToActiveTab = (variable) =>
      isSecretTab ? !!variable.secret : !variable.secret;

    const savedValues = environment.variables || [];
    const activeSaved = savedValues.filter(belongsToActiveTab);
    const otherSaved = savedValues.filter(
      (variable) => !belongsToActiveTab(variable)
    );
    const otherCurrent = formik.values
      .filter((variable) => variable.name && variable.name.trim() !== '')
      .filter((variable) => !belongsToActiveTab(variable));

    // Reset is scoped to the active tab: revert its rows to the saved baseline while
    // leaving the other tab's current (possibly unsaved) edits intact.
    const resetVariables = orderVarsBySecret([...activeSaved, ...otherCurrent]);

    const otherDirty
      = JSON.stringify(otherCurrent.map(stripEnvVarUid))
        !== JSON.stringify(otherSaved.map(stripEnvVarUid));

    if (otherDirty) {
      onDraftChange(cloneDeep(resetVariables));
    } else {
      onDraftClear();
    }

    sortOrderRef.current = buildSortOrder(resetVariables, sortMode);

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
  }, [
    environment.variables,
    formik.values,
    isSecretTab,
    onDraftChange,
    onDraftClear,
    setIsModified,
    buildSortOrder,
    sortMode
  ]);

  const handleSaveAll = useCallback(() => {
    const namedValues = formik.values.filter(
      (variable) => variable.name && variable.name.trim() !== ''
    );
    const savedValues = environment.variables || [];

    const persistedVariables = orderVarsBySecret(namedValues);

    const hasChanges
      = JSON.stringify(persistedVariables.map(stripEnvVarUid))
        !== JSON.stringify(savedValues.map(stripEnvVarUid));
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

    if (getDuplicateSecretNames(namedValues).size > 0) {
      toast.error(DUPLICATE_SECRET_NAMES_ERROR);
      return;
    }

    onSave(cloneDeep(persistedVariables))
      .then(() => {
        toast.success('Changes saved successfully');
        onDraftClear();

        sortOrderRef.current = buildSortOrder(persistedVariables, sortMode);

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
  }, [
    formik.values,
    environment.variables,
    onSave,
    onDraftClear,
    setIsModified,
    isSecretTab,
    buildSortOrder,
    sortMode
  ]);

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
          = index === lastIndex
            && (!variable.name
              || (typeof variable.name === 'string' && variable.name.trim() === ''));
        if (isLastEmptyRow) return true;
        return isSecretTab ? !!variable.secret : !variable.secret;
      });

    if (!searchQuery?.trim()) {
      return tabVariables;
    }

    const query = searchQuery.toLowerCase().trim();

    const effectivePins
      = pinnedData.query === searchQuery ? pinnedData.uids : new Set();
    return tabVariables.filter(({ variable }) => {
      if (effectivePins.has(variable.uid)) return true;
      const nameMatch = variable.name
        ? variable.name.toLowerCase().includes(query)
        : false;
      const valueText
        = typeof variable.value === 'string'
          ? variable.value
          : typeof variable.value === 'number'
            || typeof variable.value === 'boolean'
            ? String(variable.value)
            : '';
      const valueMatch = valueText.toLowerCase().includes(query);
      const descriptionMatch
        = variable.description && typeof variable.description === 'string'
          ? variable.description.toLowerCase().includes(query)
          : false;

      return !!(nameMatch || valueMatch || descriptionMatch);
    });
  }, [formik.values, searchQuery, pinnedData, isSecretTab]);

  const displayedVariables = useMemo(() => {
    if (sortMode === 'default' || !sortOrderRef.current) {
      return filteredVariables;
    }

    const lastFormikIndex = formik.values.length - 1;
    const trailingIdx = filteredVariables.findIndex(
      (entry) => entry.index === lastFormikIndex
    );
    const hasTrailing = trailingIdx !== -1;
    const trailing = hasTrailing ? filteredVariables[trailingIdx] : null;
    const sortable = hasTrailing
      ? filteredVariables.filter((_, i) => i !== trailingIdx)
      : filteredVariables;

    const byUid = new Map(sortable.map((entry) => [entry.variable.uid, entry]));
    const knownUids = new Set(sortOrderRef.current);
    const ordered = sortOrderRef.current
      .filter((uid) => byUid.has(uid))
      .map((uid) => byUid.get(uid));
    const added = sortable.filter(
      (entry) => !knownUids.has(entry.variable.uid)
    );
    const sorted = [...ordered, ...added];

    return hasTrailing ? [...sorted, trailing] : sorted;
  }, [filteredVariables, sortMode]);

  return (
    <StyledWrapper
      className={`${
        resizing ? 'is-resizing' : ''
      } has-description-column`.trim()}
    >
      {isSearchActive && displayedVariables.length === 0 ? (
        <div className="no-results">
          No results found for &ldquo;{searchQuery.trim()}&rdquo;
        </div>
      ) : (
        <TableVirtuoso
          className="table-container"
          style={{ height: tableHeight }}
          scrollerRef={setScrollerEl}
          initialTopMostItemIndex={initialTopMostItemIndex}
          overscan={Math.min(30, displayedVariables.length)}
          components={{ TableRow }}
          context={dragContext}
          data={displayedVariables}
          totalListHeightChanged={handleTotalHeightChanged}
          fixedHeaderContent={() => (
            <tr>
              <td className="text-center"></td>
              <td
                style={{ width: columnWidths.name }}
                className="sortable-header"
                onClick={(e) => {
                  if (!e.target.closest('.resize-handle')) cycleSortMode();
                }}
              >
                <ColumnSortHeader
                  label="Name"
                  SortIcon={SortIcon}
                  sortLabel={sortLabel}
                />
                <div
                  className={`resize-handle ${
                    resizing === 'name' ? 'resizing' : ''
                  }`}
                  style={{
                    height: tableHeight > 0 ? `${tableHeight}px` : undefined
                  }}
                  onMouseDown={(e) => handleResizeStart(e, 'name')}
                />
              </td>
              <td style={{ width: columnWidths.value }}>
                Value
                <div
                  className={`resize-handle ${
                    resizing === 'value' ? 'resizing' : ''
                  }`}
                  style={{
                    height: tableHeight > 0 ? `${tableHeight}px` : undefined
                  }}
                  onMouseDown={(e) => handleResizeStart(e, 'value')}
                />
              </td>
              <td style={{ width: columnWidths.description }}>Description</td>
              <td className="actions-column"></td>
            </tr>
          )}
          defaultItemHeight={35}
          computeItemKey={(virtualIndex, item) =>
            item.variable?.uid || `${environment.uid}-${item.index}`}
          itemContent={(virtualIndex, { variable, index: actualIndex }) => {
            const isLastRow = actualIndex === formik.values.length - 1;
            const isEmptyRow = !variable.name || variable.name.trim() === '';
            const isLastEmptyRow = isLastRow && isEmptyRow;
            const rowError = getRowError(variable, actualIndex);

            return (
              <EnvVarRow
                virtualIndex={virtualIndex}
                variable={variable}
                actualIndex={actualIndex}
                isLastRow={isLastRow}
                isEmptyRow={isEmptyRow}
                isLastEmptyRow={isLastEmptyRow}
                dragEnabled={dragEnabled}
                columnWidths={columnWidths}
                isSecretTab={isSecretTab}
                storedTheme={storedTheme}
                collection={_collection}
                rowError={rowError}
                formik={formik}
                handleRowFocus={handleRowFocus}
                handleSave={handleSave}
                handleNameChange={handleNameChange}
                handleNameBlur={handleNameBlur}
                handleNameKeyDown={handleNameKeyDown}
                handleRemoveVar={handleRemoveVar}
                handleDragHandleMouseDown={handleDragHandleMouseDown}
                renderExtraValueContent={renderExtraValueContent}
              />
            );
          }}
        />
      )}

      {/* We should re-think of these buttons placement in component as we use TableVirtuoso which because of
      these buttons renders at some transition: height 0.1s ease` */}
      <div className="button-container">
        <div className="flex items-center">
          <button
            type="button"
            className="submit"
            onClick={handleSave}
            data-testid="save-env"
          >
            Save
          </button>
          <button
            type="button"
            className="submit reset ml-2"
            onClick={handleReset}
            data-testid="reset-env"
          >
            Reset
          </button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentVariablesTable;

import React, { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash, IconAlertCircle, IconInfoCircle } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';
import MultiLineEditor from 'components/MultiLineEditor/index';
import StyledWrapper from './StyledWrapper';
import { uuid } from 'utils/common';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { variableNameRegex } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import { getGlobalEnvironmentVariables } from 'utils/collections';

const MIN_H = 35 * 2;
const MIN_COLUMN_WIDTH = 80;

const TableRow = React.memo(
  ({ children, item }) => (
    <tr key={item.uid} data-testid={`env-var-row-${item.name}`}>
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

  const hasDraftForThisEnv = draft?.environmentUid === environment.uid;

  const [tableHeight, setTableHeight] = useState(MIN_H);
  const [columnWidths, setColumnWidths] = useState({ name: '30%', value: 'auto' });
  const [resizing, setResizing] = useState(null);

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

      setColumnWidths({
        [columnKey]: `${startWidth + clampedDiff}px`,
        [nextColumnKey]: `${nextColumnStartWidth - clampedDiff}px`
      });
    };

    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  const handleTotalHeightChanged = useCallback((h) => {
    setTableHeight(h);
  }, []);

  const prevEnvUidRef = useRef(null);
  const mountedRef = useRef(false);

  let _collection = collection ? cloneDeep(collection) : {};
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  if (_collection) {
    _collection.globalEnvironmentVariables = globalEnvironmentVariables;
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

    prevEnvUidRef.current = environment.uid;
    mountedRef.current = true;

    if ((isMount || envChanged) && hasDraftForThisEnv && draft?.variables) {
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
  }, [environment.uid, hasDraftForThisEnv, draft?.variables]);

  const savedValuesJson = useMemo(() => {
    return JSON.stringify(environment.variables || []);
  }, [environment.variables]);

  // Sync modified state
  useEffect(() => {
    const currentValues = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
    const currentValuesJson = JSON.stringify(currentValues);
    const hasActualChanges = currentValuesJson !== savedValuesJson;
    setIsModified(hasActualChanges);
  }, [formik.values, savedValuesJson, setIsModified]);

  // Sync draft state
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentValues = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
      const currentValuesJson = JSON.stringify(currentValues);
      const hasActualChanges = currentValuesJson !== savedValuesJson;

      const existingDraftVariables = hasDraftForThisEnv ? draft?.variables : null;
      const existingDraftJson = existingDraftVariables ? JSON.stringify(existingDraftVariables) : null;

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

    const hasChanges = JSON.stringify(variablesToSave) !== JSON.stringify(savedValues);
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
  }, [formik.values, environment.variables, onSave, setIsModified]);

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

    return allVariables.filter(({ variable, index }) => {
      const isLastRow = index === formik.values.length - 1;
      const isEmptyRow = !variable.name || variable.name.trim() === '';
      if (isLastRow && isEmptyRow) {
        return true;
      }

      const nameMatch = variable.name ? variable.name.toLowerCase().includes(query) : false;
      const valueMatch = typeof variable.value === 'string' ? variable.value.toLowerCase().includes(query) : false;

      return !!(nameMatch || valueMatch);
    });
  }, [formik.values, searchQuery]);

  return (
    <StyledWrapper className={resizing ? 'is-resizing' : ''}>
      <TableVirtuoso
        className="table-container"
        style={{ height: tableHeight }}
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
        fixedItemHeight={35}
        computeItemKey={(index, item) => item.variable.uid}
        itemContent={(index, { variable, index: actualIndex }) => {
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
                    placeholder={!variable.value || (typeof variable.value === 'string' && variable.value.trim() === '') ? 'Value' : ''}
                    onChange={(e) => handleNameChange(actualIndex, e)}
                    onBlur={() => handleNameBlur(actualIndex)}
                    onKeyDown={(e) => handleNameKeyDown(actualIndex, e)}
                  />
                  <ErrorMessage name={`${actualIndex}.name`} index={actualIndex} />
                </div>
              </td>
              <td className="flex flex-row flex-nowrap items-center" style={{ width: columnWidths.value }}>
                <div className="overflow-hidden grow w-full relative">
                  <MultiLineEditor
                    theme={storedTheme}
                    collection={_collection}
                    name={`${actualIndex}.value`}
                    value={variable.value}
                    placeholder={isLastEmptyRow ? 'Value' : ''}
                    isSecret={variable.secret}
                    readOnly={typeof variable.value !== 'string'}
                    onChange={(newValue) => formik.setFieldValue(`${actualIndex}.value`, newValue, true)}
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

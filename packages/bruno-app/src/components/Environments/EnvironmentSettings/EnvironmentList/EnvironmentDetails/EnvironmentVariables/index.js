import React, { useCallback, useRef, useMemo, useEffect } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import cloneDeep from 'lodash/cloneDeep';
import { get } from 'lodash';
import { IconTrash, IconAlertCircle, IconInfoCircle } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
import MultiLineEditor from 'components/MultiLineEditor/index';
import StyledWrapper from './StyledWrapper';
import { uuid } from 'utils/common';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { variableNameRegex } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { setEnvironmentsDraft, clearEnvironmentsDraft } from 'providers/ReduxStore/slices/collections';
import { Tooltip } from 'react-tooltip';
import { getGlobalEnvironmentVariables, flattenItems, isItemARequest } from 'utils/collections';
import SensitiveFieldWarning from 'components/SensitiveFieldWarning';
import { sensitiveFields } from './constants';

const TableRow = React.memo(({ children, item }) => <tr key={item.uid} data-testid={`env-var-row-${item.name}`}>{children}</tr>, (prevProps, nextProps) => {
  const prevUid = prevProps?.item?.uid;
  const nextUid = nextProps?.item?.uid;
  return prevUid === nextUid && prevProps.children === nextProps.children;
});

const MIN_H = 35 * 2; // 2 rows worth of height

const EnvironmentVariables = ({ environment, setIsModified, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);

  const [tableHeight, setTableHeight] = React.useState(MIN_H);

  const environmentsDraft = collection?.environmentsDraft;
  const hasDraftForThisEnv = environmentsDraft?.environmentUid === environment.uid;

  const handleTotalHeightChanged = React.useCallback((h) => {
    setTableHeight(h);
  }, []);

  // Track environment changes for draft restoration
  const prevEnvUidRef = React.useRef(null);
  const mountedRef = React.useRef(false);

  let _collection = collection ? cloneDeep(collection) : {};

  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  if (_collection) {
    _collection.globalEnvironmentVariables = globalEnvironmentVariables;
  }

  // Check for non-secret variables used in sensitive fields
  const nonSecretSensitiveVarUsageMap = useMemo(() => {
    const result = {};
    if (!collection || !environment?.variables) {
      return result;
    }
    const nonSecretVars = environment.variables.filter((v) => v.enabled && !v.secret && v.name);
    if (!nonSecretVars.length) {
      return result;
    }
    const varNames = new Set(nonSecretVars.map((v) => v.name));

    const checkSensitiveField = (obj, fieldPath) => {
      const value = get(obj, fieldPath);
      if (typeof value === 'string') {
        varNames.forEach((varName) => {
          if (new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`).test(value)) {
            result[varName] = true;
          }
        });
      }
    };

    const getObjectToProcess = (item) => {
      if (isItemARequest(item)) {
        return item.draft || item;
      }
      return item.root;
    };

    const collectionObj = getObjectToProcess(collection);
    sensitiveFields.forEach((fieldPath) => {
      checkSensitiveField(collectionObj, fieldPath);
    });

    const items = flattenItems(collection.items || []);
    items.forEach((item) => {
      const objToProcess = getObjectToProcess(item);
      sensitiveFields.forEach((fieldPath) => {
        checkSensitiveField(objToProcess, fieldPath);
      });
    });
    return result;
  }, [collection, environment]);

  const hasSensitiveUsage = (name) => !!nonSecretSensitiveVarUsageMap[name];

  // Initial values based only on saved environment variables (not draft)
  // Draft restoration happens in a separate effect to avoid infinite loops
  const initialValues = React.useMemo(() => {
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
        name: Yup.string()
          .when('$isLastRow', {
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

    if ((isMount || envChanged) && hasDraftForThisEnv && environmentsDraft?.variables) {
      formik.setValues([
        ...environmentsDraft.variables,
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
  }, [environment.uid, hasDraftForThisEnv, environmentsDraft?.variables]);

  const savedValuesJson = useMemo(() => {
    return JSON.stringify(environment.variables || []);
  }, [environment.variables]);

  useEffect(() => {
    const currentValues = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
    const currentValuesJson = JSON.stringify(currentValues);
    const hasActualChanges = currentValuesJson !== savedValuesJson;
    setIsModified(hasActualChanges);
  }, [formik.values, savedValuesJson, setIsModified]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentValues = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
      const currentValuesJson = JSON.stringify(currentValues);
      const hasActualChanges = currentValuesJson !== savedValuesJson;

      // Get existing draft for comparison
      const existingDraftVariables = hasDraftForThisEnv ? environmentsDraft?.variables : null;
      const existingDraftJson = existingDraftVariables ? JSON.stringify(existingDraftVariables) : null;

      if (hasActualChanges) {
        // Only dispatch if draft values are actually different
        if (currentValuesJson !== existingDraftJson) {
          dispatch(setEnvironmentsDraft({
            collectionUid: collection.uid,
            environmentUid: environment.uid,
            variables: currentValues
          }));
        }
      } else if (hasDraftForThisEnv) {
        dispatch(clearEnvironmentsDraft({ collectionUid: collection.uid }));
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [formik.values, savedValuesJson, environment.uid, collection.uid, dispatch, hasDraftForThisEnv, environmentsDraft?.variables]);

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

  const handleRemoveVar = useCallback((id) => {
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
  }, [formik.values]);

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

  const handleSave = () => {
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

    dispatch(saveEnvironment(cloneDeep(variablesToSave), environment.uid, collection.uid))
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
  };

  const handleReset = () => {
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
  };

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

  return (
    <StyledWrapper>
      <TableVirtuoso
        className="table-container"
        style={{ height: tableHeight }}
        components={{ TableRow }}
        data={formik.values}
        totalListHeightChanged={handleTotalHeightChanged}
        fixedHeaderContent={() => (
          <tr>
            <td className="text-center"></td>
            <td>Name</td>
            <td>Value</td>
            <td className="text-center">Secret</td>
            <td></td>
          </tr>
        )}
        fixedItemHeight={35}
        computeItemKey={(index, variable) => variable.uid}
        itemContent={(index, variable) => {
          const isLastRow = index === formik.values.length - 1;
          const isEmptyRow = !variable.name || variable.name.trim() === '';
          const isLastEmptyRow = isLastRow && isEmptyRow;

          return (
            <>
              <td className="text-center">
                {!isLastEmptyRow && (
                  <input
                    type="checkbox"
                    className="mousetrap"
                    name={`${index}.enabled`}
                    checked={variable.enabled}
                    onChange={formik.handleChange}
                  />
                )}
              </td>
              <td>
                <div className="flex items-center">
                  <input
                    type="text"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    className="mousetrap"
                    id={`${index}.name`}
                    name={`${index}.name`}
                    value={variable.name}
                    placeholder={isLastEmptyRow ? 'Name' : ''}
                    onChange={(e) => handleNameChange(index, e)}
                    onBlur={() => handleNameBlur(index)}
                    onKeyDown={(e) => handleNameKeyDown(index, e)}
                  />
                  <ErrorMessage name={`${index}.name`} index={index} />
                </div>
              </td>
              <td className="flex flex-row flex-nowrap items-center">
                <div className="overflow-hidden grow w-full relative">
                  <MultiLineEditor
                    theme={storedTheme}
                    collection={_collection}
                    name={`${index}.value`}
                    value={variable.value}
                    placeholder={isLastEmptyRow ? 'Value' : ''}
                    isSecret={variable.secret}
                    readOnly={typeof variable.value !== 'string'}
                    onChange={(newValue) => formik.setFieldValue(`${index}.value`, newValue, true)}
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
                {!variable.secret && hasSensitiveUsage(variable.name) && (
                  <SensitiveFieldWarning
                    fieldName={variable.name}
                    warningMessage="This variable is used in sensitive fields. Mark it as a secret for security"
                  />
                )}
              </td>
              <td className="text-center">
                {!isLastEmptyRow && (
                  <input
                    type="checkbox"
                    className="mousetrap"
                    name={`${index}.secret`}
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

export default EnvironmentVariables;

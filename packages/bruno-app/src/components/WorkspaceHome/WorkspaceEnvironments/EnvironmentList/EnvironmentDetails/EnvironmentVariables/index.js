import React from 'react';
import cloneDeep from 'lodash/cloneDeep';
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
import { saveGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { Tooltip } from 'react-tooltip';
import { getGlobalEnvironmentVariables } from 'utils/collections';

const EnvironmentVariables = ({ environment, setIsModified, originalEnvironmentVariables, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);

  let _collection = collection ? cloneDeep(collection) : {};

  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  if (_collection) {
    _collection.globalEnvironmentVariables = globalEnvironmentVariables;
  }

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
    validationSchema: Yup.array().of(Yup.object({
      enabled: Yup.boolean(),
      name: Yup.string()
        .when('$isLastRow', {
          is: true,
          then: (schema) => schema.optional(),
          otherwise: (schema) => schema
            .required('Name cannot be empty')
            .matches(variableNameRegex,
              'Name contains invalid characters. Must only contain alphanumeric characters, "-", "_", "." and cannot start with a digit.')
            .trim()
        }),
      secret: Yup.boolean(),
      type: Yup.string(),
      uid: Yup.string(),
      value: Yup.mixed().nullable()
    })),
    validate: (values) => {
      const errors = {};
      values.forEach((variable, index) => {
        const isLastRow = index === values.length - 1;
        const isEmptyRow = !variable.name || variable.name.trim() === '';

        // Skip validation for the last empty row
        if (isLastRow && isEmptyRow) {
          return;
        }

        // Validate name for non-empty rows
        if (!variable.name || variable.name.trim() === '') {
          if (!errors[index]) errors[index] = {};
          errors[index].name = 'Name cannot be empty';
        } else if (!variableNameRegex.test(variable.name)) {
          if (!errors[index]) errors[index] = {};
          errors[index].name = 'Name contains invalid characters. Must only contain alphanumeric characters, "-", "_", "." and cannot start with a digit.';
        }
      });
      return Object.keys(errors).length > 0 ? errors : {};
    },
    onSubmit: () => {}
  });

  React.useEffect(() => {
    const currentValues = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
    const savedValues = environment.variables || [];

    const hasActualChanges = JSON.stringify(currentValues) !== JSON.stringify(savedValues);

    setIsModified(hasActualChanges);
  }, [formik.values, environment.variables, setIsModified]);

  const ErrorMessage = ({ name, index }) => {
    const meta = formik.getFieldMeta(name);
    const id = `error-${name}-${index}`;

    // Don't show error for the last empty row
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

  const handleRemoveVar = (id) => {
    const filteredValues = formik.values.filter((variable) => variable.uid !== id);

    const lastRow = formik.values[formik.values.length - 1];
    const isLastEmptyRow = lastRow.uid === id && (!lastRow.name || lastRow.name.trim() === '');

    if (isLastEmptyRow) {
      return;
    }

    const hasEmptyLastRow = filteredValues.length > 0
      && (!filteredValues[filteredValues.length - 1].name
        || filteredValues[filteredValues.length - 1].name.trim() === '');

    if (!hasEmptyLastRow) {
      filteredValues.push({
        uid: uuid(),
        name: '',
        value: '',
        type: 'text',
        secret: false,
        enabled: true
      });
    }

    formik.setValues(filteredValues);
  };

  const handleNameChange = (index, e) => {
    formik.handleChange(e);
    const isLastRow = index === formik.values.length - 1;

    // If typing in the last row, add a new empty row
    if (isLastRow) {
      const newVariable = {
        uid: uuid(),
        name: '',
        value: '',
        type: 'text',
        secret: false,
        enabled: true
      };
      // Use setTimeout to ensure the change is processed first
      setTimeout(() => {
        formik.setFieldValue(formik.values.length, newVariable, false);
      }, 0);
    }
  };

  const handleSave = () => {
    const variablesToSave = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');

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

    dispatch(saveGlobalEnvironment({ environmentUid: environment.uid, variables: cloneDeep(variablesToSave) }))
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
  };

  return (
    <StyledWrapper>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <td className="text-center"></td>
              <td>Name</td>
              <td>Value</td>
              <td className="text-center">Secret</td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            {formik.values.map((variable, index) => {
              const isLastRow = index === formik.values.length - 1;
              const isEmptyRow = !variable.name || variable.name.trim() === '';
              const isLastEmptyRow = isLastRow && isEmptyRow;

              return (
                <tr key={variable.uid}>
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
                      />
                    </div>
                    {typeof variable.value !== 'string' && (
                      <span className="ml-2 flex items-center">
                        <IconInfoCircle
                          id={`${variable.uid}-disabled-info-icon`}
                          className="text-muted"
                          size={16}
                        />
                        <Tooltip
                          anchorId={`${variable.uid}-disabled-info-icon`}
                          content="Non-string values set via scripts are read-only and can only be updated through scripts."
                          place="top"
                        />
                      </span>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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

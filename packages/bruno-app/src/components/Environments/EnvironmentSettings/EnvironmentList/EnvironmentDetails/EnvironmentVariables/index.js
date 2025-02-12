import React, { useRef, useEffect } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash, IconAlertCircle, IconDeviceFloppy, IconRefresh, IconCircleCheck } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import { selectEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import { uuid } from 'utils/common';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { variableNameRegex } from 'utils/common/regex';
import { saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';
import { Inspector } from 'react-inspector';

const EnvironmentVariables = ({ environment, collection, setIsModified, originalEnvironmentVariables, onClose }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const addButtonRef = useRef(null);

  const initialVariables = (environment.variables || []).map((variable) => {
    const value = variable.value;
    let type = typeof value;
    let displayValue = '';

    if (type === 'object') {
      displayValue = JSON.stringify(value, null, 2);
    } else {
      // For numbers and booleans, convert to string
      displayValue = String(value);
    }

    return {
      ...variable,
      value,
      displayValue,
      type: type === 'string' ? "text" : type,
    };
  });

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: initialVariables || [],
    validationSchema: Yup.array().of(
      Yup.object({
        enabled: Yup.boolean(),
        name: Yup.string()
          .required('Name cannot be empty')
          .matches(
            variableNameRegex,
            'Name contains invalid characters. Must only contain alphanumeric characters, "-", "_", "." and cannot start with a digit.'
          )
          .trim(),
        secret: Yup.boolean(),
        type: Yup.string(),
        uid: Yup.string(),
        displayValue: Yup.string().trim().nullable(), // Use displayValue here
      })
    ),
    onSubmit: (values) => {
      if (!formik.dirty) {
        toast.error('Nothing to save');
        return;
      }

      const variablesWithActualValues = values.map((variable) => {
        let actualValue;
        const type = variable.type;
        const displayValue = variable.displayValue;

        if (displayValue === null || displayValue === undefined) {
          actualValue = null;
        } else {
          switch (type) {
            case 'text':
              actualValue = displayValue;
              break;
            case 'number':
              actualValue = Number(displayValue);
              if (isNaN(actualValue)) {
                actualValue = 0; // Default to 0 or handle error
              }
              break;
            case 'boolean':
              actualValue = displayValue.toLowerCase() === 'true';
              break;
            case 'object':
              try {
                actualValue = JSON.parse(displayValue);
              } catch (e) {
                actualValue = {}; // Default to empty object or handle error
              }
              break;
            default:
              actualValue = displayValue;
          }
        }

        return {
          ...variable,
          value: actualValue, // Actual value to be used in scripts
          displayValue: variable.displayValue, // For the GUI
          type,
        };
      });

      dispatch(saveEnvironment(cloneDeep(variablesWithActualValues), environment.uid, collection.uid))
        .then(() => {
          toast.success('Changes saved successfully');
          setIsModified(false);
        })
        .catch(() => toast.error('An error occurred while saving the changes'));
    },
  });


  // Effect to track modifications.
  React.useEffect(() => {
    setIsModified(formik.dirty);
  }, [formik.dirty]);

  const ErrorMessage = ({ name }) => {
    const meta = formik.getFieldMeta(name);
    const id = uuid();
    if (!meta.error || !meta.touched) {
      return null;
    }
    return (
      <span>
        <IconAlertCircle id={id} className="text-red-600 cursor-pointer	" size={20} />
        <Tooltip className="tooltip-mod" anchorId={id} html={meta.error || ''} />
      </span>
    );
  };

  const addVariable = () => {
    const newVariable = {
      uid: uuid(),
      name: '',
      value: '',
      type: 'text',
      secret: false,
      enabled: true
    };
    formik.setFieldValue(formik.values.length, newVariable, false);
  };

  const onActivate = () => {
    dispatch(selectEnvironment(environment ? environment.uid : null, collection.uid))
      .then(() => {
        if (environment) {
          toast.success(`Environment changed to ${environment.name}`);
          onClose();
        } else {
          toast.success(`No Environments are active now`);
        }
      })
      .catch((err) => console.log(err) && toast.error('An error occurred while selecting the environment'));
  };

  const handleRemoveVar = (id) => {
    formik.setValues(formik.values.filter((variable) => variable.uid !== id));
  };

  useEffect(() => {
    if (formik.dirty) {
      // Smooth scrolling to the changed parameter is temporarily disabled 
      // due to UX issues when editing the first row in a long list of environment variables.
      // addButtonRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [formik.values, formik.dirty]);

  const handleReset = () => {
    formik.resetForm({ originalEnvironmentVariables });
  };

  return (
    <StyledWrapper className="w-full mt-6 mb-6">
      <div className="h-[50vh] overflow-y-auto w-full">
        <table>
          <thead>
            <tr>
              <td className="text-center">Enabled</td>
              <td>Name</td>
              <td>Value</td>
              <td className="text-center">Secret</td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            {formik.values.map((variable, index) => (
              <tr key={variable.uid}>
                <td className="text-center">
                  <input
                    type="checkbox"
                    className="mousetrap"
                    name={`${index}.enabled`}
                    checked={variable.enabled}
                    onChange={formik.handleChange}
                  />
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
                      onChange={formik.handleChange}
                    />
                    <ErrorMessage name={`${index}.name`} />
                  </div>
                </td>
                <td className="flex flex-row flex-nowrap">
                  <div className="overflow-hidden grow w-full relative">
                    {variable.type == "text" ?
                      <SingleLineEditor
                        theme={storedTheme}
                        collection={collection}
                        name={`${index}.displayValue`}
                        value={variable.displayValue || variable.value}
                        isSecret={variable.secret}
                        onChange={(newValue) => formik.setFieldValue(`${index}.displayValue`, newValue, true)}
                      />
                      :
                      <>
                        {variable.type == "object" &&
                          <Inspector
                            data={variable.value}
                            theme={"chromeDark"}
                          />
                        }
                        {variable.type == "number" && <input
                          name={`${index}.displayValue`}
                          type='text'
                          value={variable.displayValue || variable.value}
                          className='opacity-70 cursor-not-allowed'
                          disabled
                        />}
                      </>
                    }
                  </div>
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    className="mousetrap"
                    name={`${index}.secret`}
                    checked={variable.secret}
                    onChange={formik.handleChange}
                  />
                </td>
                <td>
                  <button onClick={() => handleRemoveVar(variable.uid)}>
                    <IconTrash strokeWidth={1.5} size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <button
            ref={addButtonRef}
            className="btn-add-param text-link pr-2 py-3 mt-2 select-none"
            onClick={addVariable}
          >
            + Add Variable
          </button>
        </div>
      </div>

      <div className="flex items-center">
        <button type="submit" className="submit btn btn-sm btn-secondary mt-2 flex items-center" onClick={formik.handleSubmit}>
          <IconDeviceFloppy size={16} strokeWidth={1.5} className="mr-1" />
          Save
        </button>
        <button type="submit" className="ml-2 px-1 submit btn btn-sm btn-close mt-2 flex items-center" onClick={handleReset}>
          <IconRefresh size={16} strokeWidth={1.5} className="mr-1" />
          Reset
        </button>
        <button type="submit" className="submit btn btn-sm btn-close mt-2 flex items-center" onClick={onActivate}>
          <IconCircleCheck size={16} strokeWidth={1.5} className="mr-1" />
          Activate
        </button>
      </div>
    </StyledWrapper>
  );
};
export default EnvironmentVariables;

import React, { useRef, useEffect } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash, IconAlertCircle, IconDeviceFloppy, IconRefresh, IconCircleCheck, IconAlertTriangle } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
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
import { getGlobalEnvironmentVariables } from 'utils/collections';

const EnvironmentVariables = ({ environment, collection, setIsModified, originalEnvironmentVariables, onClose }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const addButtonRef = useRef(null);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);

  let _collection = cloneDeep(collection);
  
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  _collection.globalEnvironmentVariables = globalEnvironmentVariables;

  const variableUsageIndex = useSelector((state) => state.variableUsageIndex.variableUsageIndex);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: environment.variables || [],
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
        value: Yup.string().trim().nullable()
      })
    ),
    onSubmit: (values) => {
      if (!formik.dirty) {
        toast.error('Nothing to save');
        return;
      }

      dispatch(saveEnvironment(cloneDeep(values), environment.uid, collection.uid))
        .then(() => {
          toast.success('Changes saved successfully');
          formik.resetForm({ values });
          setIsModified(false);
        })
        .catch(() => toast.error('An error occurred while saving the changes'));
    }
  });

  const hasSecurityWarning = (name) => {
    const references = variableUsageIndex[name] || [];
    return references.length > 0;
  };

  const SecurityWarning = ({ name }) => {
    const references = variableUsageIndex[name] || [];
    if (references.length === 0) return null;

    const tooltipId = `security-warning-${name}`;
    return (
      <span className="ml-2">
        <IconAlertTriangle
          id={tooltipId}
          className="text-amber-500 cursor-pointer"
          size={20}
          strokeWidth={1.5}
        />
        <Tooltip
          className="tooltip-mod max-w-lg"
          anchorId={tooltipId}
          content={
            <div>
              <p>This variable is used in sensitive fields. Mark it as a secret for security</p>
            </div>
          }
        />
      </span>
    );
  };

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
                    <SingleLineEditor
                      theme={storedTheme}
                      collection={_collection}
                      name={`${index}.value`}
                      value={variable.value}
                      isSecret={variable.secret}
                      onChange={(newValue) => formik.setFieldValue(`${index}.value`, newValue, true)}
                    />
                  </div>
                  {!variable.secret && hasSecurityWarning(variable.name) && (
                      <SecurityWarning name={variable.name} />
                  )}
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

import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { createApiSpecFile } from 'providers/ReduxStore/slices/apiSpec';
import { useState } from 'react';
import StyledWrapper from './StyledWrapper';
import { exportApiSpec } from 'utils/exporters/openapi-spec';
import { each } from 'lodash';
import { showApiSpecPage } from 'providers/ReduxStore/slices/app';
import { validateName, validateNameError } from 'utils/common/regex';

export const getEnvironmentVariablesKeyValuePairs = (envVariables) => {
  let variables = {};
  each(envVariables, (variable) => {
    if (variable.name && variable.value && variable.enabled) {
      variables[variable.name] = variable.value;
    }
  });
  return variables;
};

const CreateApiSpec = ({ onClose }) => {
  const inputRef = useRef();
  const dispatch = useDispatch();
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);
  const [defaultApiSpecLocation, setDefaultApiSpecLocation] = React.useState('');

  const isDefaultWorkspace = !activeWorkspace || activeWorkspace.type === 'default';

  React.useEffect(() => {
    const getDefaultLocation = async () => {
      if (activeWorkspace && activeWorkspace.pathname && activeWorkspace.type !== 'default') {
        try {
          const { ipcRenderer } = window;
          const apiSpecPath = await ipcRenderer.invoke('renderer:ensure-apispec-folder', activeWorkspace.pathname);
          setDefaultApiSpecLocation(apiSpecPath);
        } catch (error) {
          console.error('Error getting apispec folder:', error);
        }
      }
    };
    getDefaultLocation();
  }, [activeWorkspace]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      importFrom: 'blank',
      collectionLocation: '',
      environment: '',
      apiSpecName: '',
      apiSpecLocation: defaultApiSpecLocation || ''
    },
    validationSchema: Yup.object({
      importFrom: Yup.string().oneOf(['blank', 'collection']),
      collectionLocation: Yup.string().min(1, 'location is required'),
      environment: Yup.string(),
      apiSpecName: Yup.string()
        .min(1, 'Must be at least 1 character')
        .max(255, 'Must be 255 characters or less')
        .test('is-valid-filename', function (value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .required('Name is required'),
      apiSpecLocation: Yup.string().min(1, 'location is required').required('location is required')
    }),
    onSubmit: async (values) => {
      let yamlContent = '';
      if (values?.importFrom === 'collection' && values?.collectionLocation && collectionData) {
        const { files, envVariables, processEnvVariables } = collectionData;
        let variables = {
          processEnvVariables
        };
        // Get selected env's variables
        if (values?.environment && values?.environment?.length) {
          variables = {
            ...getEnvironmentVariablesKeyValuePairs(envVariables[values?.environment] || {}),
            ...variables
          };
        }
        // Create API spec yaml
        let exportedYamlContentData = exportApiSpec({ name: values?.apiSpecName, variables, items: files });
        if (exportedYamlContentData?.content) {
          yamlContent = exportedYamlContentData?.content;
        }
      }

      dispatch(createApiSpecFile(`${values.apiSpecName}.yaml`, values.apiSpecLocation, yamlContent))
        .then(() => {
          setTimeout(() => {
            dispatch(showApiSpecPage());
          }, 200);
          toast.success('ApiSpec created');
          onClose();
        })
        .catch((err) => toast.error(err?.message));
    }
  });

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        // When the user closes the diolog without selecting anything dirPath will be false
        if (typeof dirPath === 'string') {
          formik.setFieldValue('apiSpecLocation', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('apiSpecLocation', '');
        console.error(error);
      });
  };

  const browseCollection = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          formik.setFieldValue('collectionLocation', dirPath);
        }
      })
      .catch((error) => {
        formik.setFieldValue('collectionLocation', '');
        console.error(error);
      });
  };

  useEffect(() => {
    if (inputRef && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputRef]);

  const [environments, setEnvironments] = useState([]);
  const [collectionData, setCollectionData] = useState(null);

  useEffect(() => {
    const collectionLocation = formik.values.collectionLocation;
    if (collectionLocation) {
      const { ipcRenderer } = window;
      ipcRenderer
        .invoke('renderer:get-collection-json', collectionLocation)
        .then(({ files, name, envVariables, processEnvVariables }) => {
          setCollectionData({ name, files, envVariables, processEnvVariables });
          const environments = envVariables || {};
          const environmentNames = Object.keys(environments);
          if (environmentNames?.length) {
            setEnvironments(environments);
            formik.setFieldValue('environment', environmentNames[0] || '');
          }
        })
        .catch((err) => {
          console.error('Error loading collection:', err);
          toast.error('Failed to load collection');
        });
    }
  }, [formik.values.collectionLocation]);

  const onSubmit = () => formik.handleSubmit();

  return (
    <StyledWrapper>
      <Modal size="sm" title="Create API Spec" confirmText="Create" handleConfirm={onSubmit} handleCancel={onClose}>
        <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="api-spec-location" className="block font-semibold mb-2">
              Template
            </label>
            <div className="flex items-center">
              <input
                id="blank"
                className="cursor-pointer"
                type="radio"
                name="importFrom"
                onChange={formik.handleChange}
                value="blank"
                checked={formik.values.importFrom === 'blank'}
              />
              <label htmlFor="blank" className="ml-1 cursor-pointer select-none">
                Blank spec
              </label>
              <input
                id="collection"
                className="ml-4 cursor-pointer"
                type="radio"
                name="importFrom"
                onChange={formik.handleChange}
                value="collection"
                checked={formik.values.importFrom === 'collection'}
              />
              <label htmlFor="collection" className="ml-1 cursor-pointer select-none">
                From Bruno Collection
              </label>
            </div>
            {formik.touched.importFrom && formik.errors.importFrom ? (
              <div className="text-red-500">{formik.errors.importFrom}</div>
            ) : null}
            {formik.values.importFrom === 'collection' ? (
              <>
                <label htmlFor="collection-location" className="block font-semibold mt-3">
                  Collection Location
                </label>
                <input
                  id="collection-location"
                  type="text"
                  name="collectionLocation"
                  readOnly={true}
                  className="block textbox mt-2 w-full cursor-pointer"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  title={formik.values.collectionLocation || ''}
                  value={formik.values.collectionLocation || ''}
                  onClick={browseCollection}
                />
                {formik.touched.collectionLocation && formik.errors.collectionLocation ? (
                  <div className="text-red-500">{formik.errors.collectionLocation}</div>
                ) : null}
                <div className="mt-1">
                  <span className="text-link cursor-pointer hover:underline" onClick={browseCollection}>
                    Browse
                  </span>
                </div>
                {environments && Object.keys(environments || {})?.length > 0 ? (
                  <>
                    <label htmlFor="api-spec-name" className="flex items-center font-semibold mt-3">
                      Environment
                    </label>
                    <div className="relative">
                      <select
                        value={formik.values.environment || ''}
                        onChange={(e) => {
                          formik.setFieldValue('environment', e.target.value);
                        }}
                        className="block textbox mt-2 w-full mousetrap"
                      >
                        {Object.keys(environments).map((env) => (
                          <option key={env} value={env}>
                            {env}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <></>
                )}
              </>
            ) : (
              <></>
            )}
            {formik.touched.environment && formik.errors.environment ? (
              <div className="text-red-500">{formik.errors.environment}</div>
            ) : null}
            <label htmlFor="api-spec-name" className="flex items-center font-semibold mt-3">
              Spec Name
            </label>
            <div className="relative">
              <input
                id="api-spec-name"
                type="text"
                name="apiSpecName"
                ref={inputRef}
                className="block textbox mt-2 !pr-11 w-full"
                onChange={(e) => {
                  formik.handleChange(e);
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                value={formik.values.apiSpecName || ''}
              />
              <div className="absolute right-2 top-0 bottom-0 h-full flex items-center api-spec-file-extension">
                .yaml
              </div>
            </div>
            {formik.touched.apiSpecName && formik.errors.apiSpecName ? (
              <div className="text-red-500">{formik.errors.apiSpecName}</div>
            ) : null}

            <label htmlFor="api-spec-location" className="block font-semibold mt-3">
              Spec Location
            </label>
            <input
              id="api-spec-location"
              type="text"
              name="apiSpecLocation"
              readOnly={true}
              className="block textbox mt-2 w-full cursor-pointer"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              title={formik.values.apiSpecLocation || ''}
              value={formik.values.apiSpecLocation || ''}
              onClick={browse}
            />
            {formik.touched.apiSpecLocation && formik.errors.apiSpecLocation ? (
              <div className="text-red-500">{formik.errors.apiSpecLocation}</div>
            ) : null}
            <div className="mt-1">
              <span className="text-link cursor-pointer hover:underline" onClick={browse}>
                Browse
              </span>
              {!isDefaultWorkspace && (
                <span className="text-xs opacity-60 ml-2">
                  (defaults to workspace's apispec folder)
                </span>
              )}
            </div>
          </div>
        </form>
      </Modal>
    </StyledWrapper>
  );
};

export default CreateApiSpec;

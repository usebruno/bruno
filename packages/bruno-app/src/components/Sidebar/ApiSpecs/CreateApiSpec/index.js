import React, { useRef, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import Portal from 'components/Portal';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { createApiSpecFile } from 'providers/ReduxStore/slices/apiSpec';
import { showApiSpecPage } from 'providers/ReduxStore/slices/app';
import { exportApiSpec } from 'utils/exporters/openapi-spec';
import { validateName, validateNameError } from 'utils/common/regex';
import { buildSkippedFilesMessage, buildExportWarningsMessage, buildSpecVariables } from 'utils/common/apiSpec';
import { getWorkspaceCollections } from 'utils/collections';
import { isHttpUrl } from 'utils/url/index';
import useDefaultApiSpecLocation from 'hooks/useDefaultApiSpecLocation';
import StyledWrapper from './StyledWrapper';
import CollectionSourceFields from './CollectionSourceFields';
import UrlSourceField from './UrlSourceField';
import AdvancedSettings from './AdvancedSettings';
import useApiSpecUrlSource from './useApiSpecUrlSource';
import useCollectionSource from './useCollectionSource';
import {
  API_SPEC_NAME_TAKEN_ERROR,
  INVALID_URL_ERROR,
  API_SPEC_SOURCE,
  COLLECTION_SOURCE,
  DEFAULT_API_SPEC_EXTENSION,
  isApiSpecNameTaken
} from './apiSpecSources';

const CreateApiSpec = ({ onClose }) => {
  const inputRef = useRef();
  const dispatch = useDispatch();
  const defaultApiSpecLocation = useDefaultApiSpecLocation();

  const apiSpecLocationEditedRef = useRef(false);
  const apiSpecNameEditedRef = useRef(false);

  const sourceMemoryRef = useRef({});

  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  const collections = useSelector((state) => state.collections.collections);
  const apiSpecs = useSelector((state) => state.apiSpec.apiSpecs);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  const activeWorkspaceUid = useSelector((state) => state.workspaces.activeWorkspaceUid);
  const activeWorkspace = workspaces.find((workspace) => workspace.uid === activeWorkspaceUid);

  const workspaceCollections = useMemo(() => (
    getWorkspaceCollections({ collections, workspaces, activeWorkspace })
  ), [collections, workspaces, activeWorkspace]);

  const urlSource = useApiSpecUrlSource();

  const getApiSpecExtension = (importFrom) => (
    importFrom === API_SPEC_SOURCE.URL && urlSource.fetchedApiSpec?.extension
      ? urlSource.fetchedApiSpec.extension
      : DEFAULT_API_SPEC_EXTENSION
  );

  const formik = useFormik({
    initialValues: {
      importFrom: API_SPEC_SOURCE.COLLECTION,
      specUrl: '',
      collectionSource: COLLECTION_SOURCE.WORKSPACE,
      collectionUid: '',
      collectionLocation: '',
      environment: '',
      apiSpecName: '',
      apiSpecLocation: ''
    },
    validationSchema: Yup.object({
      importFrom: Yup.string().oneOf(Object.values(API_SPEC_SOURCE)),
      specUrl: Yup.string().when('importFrom', {
        is: API_SPEC_SOURCE.URL,
        then: Yup.string()
          .required('Spec URL is required')
          .test('is-valid-url', INVALID_URL_ERROR, (value) => isHttpUrl(String(value || '').trim())),
        otherwise: Yup.string()
      }),
      collectionSource: Yup.string().oneOf(Object.values(COLLECTION_SOURCE)),

      collectionUid: Yup.string().when(['importFrom', 'collectionSource'], {
        is: (importFrom, collectionSource) => (
          importFrom === API_SPEC_SOURCE.COLLECTION && collectionSource === COLLECTION_SOURCE.WORKSPACE
        ),
        then: Yup.string().required('Collection is required'),
        otherwise: Yup.string()
      }),
      collectionLocation: Yup.string().when(['importFrom', 'collectionSource'], {
        is: (importFrom, collectionSource) => (
          importFrom === API_SPEC_SOURCE.COLLECTION && collectionSource === COLLECTION_SOURCE.FILESYSTEM
        ),
        then: Yup.string().min(1, 'Collection location is required').required('Collection location is required'),
        otherwise: Yup.string()
      }),
      environment: Yup.string(),
      apiSpecName: Yup.string()
        .min(1, 'Must be at least 1 character')
        .max(255, 'Must be 255 characters or less')
        .test('is-valid-filename', function (value) {
          const isValid = validateName(value);
          return isValid ? true : this.createError({ message: validateNameError(value) });
        })
        .test('is-not-taken', API_SPEC_NAME_TAKEN_ERROR, function (value) {
          return !isApiSpecNameTaken({
            apiSpecs,
            apiSpecName: value,
            apiSpecLocation: this.parent.apiSpecLocation
          });
        })
        .required('Name is required'),
      apiSpecLocation: Yup.string().min(1, 'location is required').required('location is required')
    }),
    onSubmit: async (values) => {
      let specContent = '';
      let apiSpecExtension = DEFAULT_API_SPEC_EXTENSION;

      if (values?.importFrom === API_SPEC_SOURCE.URL) {
        const apiSpec = await urlSource.resolve(values.specUrl);
        if (!apiSpec) {
          return;
        }
        specContent = apiSpec.rawContent;
        apiSpecExtension = apiSpec.extension;
      }

      let exportWarnings = [];
      if (values?.importFrom === API_SPEC_SOURCE.COLLECTION) {
        if (!collectionSource.collectionData?.configFile) {
          toast.error('Could not load that collection. Pick a folder that contains a bruno.json or opencollection.yml.');
          return;
        }

        try {
          const exported = exportCollectionAsApiSpec(values);
          specContent = exported.content;
          exportWarnings = exported.warnings;
        } catch (error) {
          console.error('Failed to build the API spec from the collection:', error);
          toast.error('Could not build an API spec from that collection');
          return;
        }
      }

      dispatch(createApiSpecFile(`${values.apiSpecName}${apiSpecExtension}`, values.apiSpecLocation, specContent))
        .then(() => {
          setTimeout(() => {
            dispatch(showApiSpecPage());
          }, 200);
          toast.success('ApiSpec created');
          if (exportWarnings.length) {
            toast(buildExportWarningsMessage(exportWarnings), { icon: '⚠️' });
          }
          onClose();
        })
        .catch((err) => {
          if (err?.message?.includes('already exists')) {
            formik.setFieldTouched('apiSpecName', true, false);
            formik.setFieldError('apiSpecName', API_SPEC_NAME_TAKEN_ERROR);
            return;
          }
          toast.error(err?.message);
        });
    }
  });

  const isWorkspaceSource = formik.values.collectionSource === COLLECTION_SOURCE.WORKSPACE;

  const selectedWorkspaceCollection = workspaceCollections.find(
    (collection) => collection.uid === formik.values.collectionUid
  ) || null;

  const collectionPathname = isWorkspaceSource
    ? selectedWorkspaceCollection?.pathname || ''
    : formik.values.collectionLocation || '';

  const collectionSource = useCollectionSource({
    collectionPathname,

    fallbackName: isWorkspaceSource ? selectedWorkspaceCollection?.name : '',
    onEnvironmentsLoaded: (environmentName) => formik.setFieldValue('environment', environmentName),
    onFilesSkipped: (skipped) => toast.error(buildSkippedFilesMessage(skipped))
  });

  const exportCollectionAsApiSpec = (values) => {
    const { requests, envVariables, processEnvVariables, collectionVariables } = collectionSource.collectionData;

    const variables = buildSpecVariables({
      collectionVariables,
      envVariables,
      environment: values?.environment,
      processEnvVariables,
      workspaceProcessEnvVariables: activeWorkspace?.processEnvVariables
    });

    const environmentsList = Object.entries(envVariables || {}).map(([name, vars]) => ({
      name,
      variables: vars
    }));

    const exported = exportApiSpec({
      name: values?.apiSpecName,
      variables,
      items: requests,
      environments: environmentsList
    });

    return { content: exported?.content || '', warnings: exported?.warnings || [] };
  };

  const selectImportFrom = (nextImportFrom) => {
    const currentImportFrom = formik.values.importFrom;
    if (nextImportFrom === currentImportFrom) {
      return;
    }

    sourceMemoryRef.current = {
      ...sourceMemoryRef.current,
      [currentImportFrom]: {
        apiSpecName: formik.values.apiSpecName,
        apiSpecLocation: formik.values.apiSpecLocation,
        nameEdited: apiSpecNameEditedRef.current,
        locationEdited: apiSpecLocationEditedRef.current
      }
    };

    const remembered = sourceMemoryRef.current[nextImportFrom];
    apiSpecNameEditedRef.current = Boolean(remembered?.nameEdited);
    apiSpecLocationEditedRef.current = Boolean(remembered?.locationEdited);

    formik.setFieldValue('apiSpecName', remembered?.apiSpecName || '');
    formik.setFieldValue('apiSpecLocation', remembered?.apiSpecLocation || defaultApiSpecLocation || '');
    formik.setFieldValue('importFrom', nextImportFrom);

    formik.setTouched({}, false);
  };

  const selectCollectionSource = (nextCollectionSource) => {
    formik.setFieldValue('collectionSource', nextCollectionSource);
    formik.setTouched({}, false);
  };

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string') {
          apiSpecLocationEditedRef.current = true;
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

  useEffect(() => {
    if (!defaultApiSpecLocation || apiSpecLocationEditedRef.current) {
      return;
    }
    formik.setFieldValue('apiSpecLocation', defaultApiSpecLocation);
  }, [defaultApiSpecLocation]);

  useEffect(() => {
    if (apiSpecNameEditedRef.current) {
      return;
    }

    const derivedName = {
      [API_SPEC_SOURCE.COLLECTION]: collectionSource.derivedName,
      [API_SPEC_SOURCE.URL]: urlSource.derivedName
    }[formik.values.importFrom] || '';

    formik.setFieldValue('apiSpecName', derivedName);
  }, [formik.values.importFrom, collectionSource.derivedName, urlSource.derivedName]);

  const isAdvancedSettingsOpen = showAdvancedSettings
    || Boolean(formik.touched.apiSpecLocation && formik.errors.apiSpecLocation);

  const onSubmit = () => formik.handleSubmit();

  const sourceRadios = [
    { value: API_SPEC_SOURCE.COLLECTION, label: 'Collection' },
    { value: API_SPEC_SOURCE.BLANK, label: 'API Spec' },
    { value: API_SPEC_SOURCE.URL, label: 'From URL' }
  ];

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="md"
          title="Create API Spec"
          confirmText="Create"
          confirmDisabled={urlSource.isFetching}
          handleConfirm={onSubmit}
          handleCancel={onClose}
        >
          <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block font-semibold mb-2">Source</label>
              <div className="flex items-center">
                {sourceRadios.map(({ value, label }, index) => (
                  <React.Fragment key={value}>
                    <input
                      id={value}
                      className={`cursor-pointer ${index ? 'ml-4' : ''}`}
                      type="radio"
                      name="importFrom"
                      value={value}
                      checked={formik.values.importFrom === value}
                      onChange={(e) => selectImportFrom(e.target.value)}
                    />
                    <label htmlFor={value} className="ml-1 cursor-pointer select-none">
                      {label}
                    </label>
                  </React.Fragment>
                ))}
              </div>

              {formik.values.importFrom === API_SPEC_SOURCE.COLLECTION ? (
                <CollectionSourceFields
                  formik={formik}
                  workspaceCollections={workspaceCollections}
                  selectedWorkspaceCollection={selectedWorkspaceCollection}
                  environmentNames={Object.keys(collectionSource.environments || {})}
                  onSelectSource={selectCollectionSource}
                  onSelectCollection={(collectionUid) => formik.setFieldValue('collectionUid', collectionUid)}
                  onSelectEnvironment={(environmentName) => formik.setFieldValue('environment', environmentName)}
                  onBrowseCollection={browseCollection}
                />
              ) : null}

              {formik.values.importFrom === API_SPEC_SOURCE.URL ? (
                <UrlSourceField
                  formik={formik}
                  isFetching={urlSource.isFetching}
                  error={urlSource.error}
                  onUrlChanged={urlSource.forget}
                  onResolveUrl={urlSource.resolve}
                />
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
                    apiSpecNameEditedRef.current = true;
                    formik.handleChange(e);
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  value={formik.values.apiSpecName || ''}
                />
                <div className="absolute right-2 top-0 bottom-0 h-full flex items-center api-spec-file-extension">
                  {getApiSpecExtension(formik.values.importFrom)}
                </div>
              </div>
              {formik.touched.apiSpecName && formik.errors.apiSpecName ? (
                <div className="text-red-500">{formik.errors.apiSpecName}</div>
              ) : null}

              <AdvancedSettings
                formik={formik}
                isOpen={isAdvancedSettingsOpen}
                onToggle={() => setShowAdvancedSettings(!showAdvancedSettings)}
                onBrowse={browse}
              />
            </div>
          </form>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default CreateApiSpec;

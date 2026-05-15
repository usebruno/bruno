import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import get from 'lodash/get';
import path from 'utils/common/path';
import { IconCaretDown } from '@tabler/icons';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { postmanToBruno } from 'utils/importers/postman-collection';
import { convertInsomniaToBruno } from 'utils/importers/insomnia-collection';
import { convertOpenapiToBruno } from 'utils/importers/openapi-collection';
import { processBrunoCollection } from 'utils/importers/bruno-collection';
import { processOpenCollection } from 'utils/importers/opencollection';
import { wsdlToBruno } from '@usebruno/converters';
import { toastError } from 'utils/common/error';
import { useBetaFeature, BETA_FEATURES } from 'utils/beta-features';
import Modal from 'components/Modal';
import Help from 'components/Help';
import Dropdown from 'components/Dropdown';
import StyledWrapper from './StyledWrapper';
import { DEFAULT_COLLECTION_FORMAT } from 'utils/common/constants';
import { useTranslation } from 'react-i18next';

// Extract collection name from raw data
const getCollectionName = (format, rawData, t) => {
  if (!rawData) return t('IMPORT.DEFAULT_COLLECTION_NAME');

  switch (format) {
    case 'openapi':
      return rawData.info?.title || t('IMPORT.OPENAPI_COLLECTION');
    case 'postman':
      return rawData.info?.name || rawData.collection?.info?.name || t('IMPORT.POSTMAN_COLLECTION');
    case 'insomnia':
      // For Insomnia v4 format, name is in the workspace resource
      if (rawData.resources && Array.isArray(rawData.resources)) {
        const workspace = rawData.resources.find((r) => r._type === 'workspace');
        if (workspace?.name) {
          return workspace.name;
        }
      }
      // Fallback to root name property
      return rawData.name || t('IMPORT.INSOMNIA_COLLECTION');
    case 'bruno':
      return rawData.name || t('IMPORT.BRUNO_COLLECTION');
    case 'opencollection':
      return rawData.info?.name || t('IMPORT.OPENCOLLECTION_COLLECTION');
    case 'wsdl':
      return t('IMPORT.WSDL_COLLECTION');
    case 'bruno-zip':
      return rawData.collectionName || t('IMPORT.BRUNO_COLLECTION');
    default:
      return t('IMPORT.DEFAULT_COLLECTION_NAME');
  }
};

// Convert raw data to Bruno collection format
const convertCollection = async (format, rawData, groupingType, collectionFormat, t) => {
  try {
    let collection;

    switch (format) {
      case 'openapi':
        collection = convertOpenapiToBruno(rawData, { groupBy: groupingType, collectionFormat });
        break;
      case 'wsdl':
        collection = await wsdlToBruno(rawData);
        break;
      case 'postman':
        collection = await postmanToBruno(rawData);
        break;
      case 'insomnia':
        collection = convertInsomniaToBruno(rawData);
        break;
      case 'bruno':
        collection = await processBrunoCollection(rawData);
        break;
      case 'opencollection':
        collection = await processOpenCollection(rawData);
        break;
      case 'bruno-zip':
        // ZIP doesn't need conversion
        collection = rawData;
        break;
      default:
        throw new Error(t('IMPORT.UNKNOWN_COLLECTION_FORMAT'));
    }

    return collection;
  } catch (err) {
    console.error('Conversion error:', err);
    toastError(err, t('IMPORT.FAILED_CONVERT_COLLECTION'));
    throw err;
  }
};

const ImportCollectionLocation = ({ onClose, handleSubmit, rawData, format, sourceUrl, filePath, rawContent }) => {
  const inputRef = useRef();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [groupingType, setGroupingType] = useState('tags');
  const [collectionFormat, setCollectionFormat] = useState(DEFAULT_COLLECTION_FORMAT);
  const isOpenAPISyncEnabled = useBetaFeature(BETA_FEATURES.OPENAPI_SYNC);
  const [enableCheckForSpecUpdates, setEnableCheckForSpecUpdates] = useState(isOpenAPISyncEnabled);
  const dropdownTippyRef = useRef();
  const isOpenApi = format === 'openapi';
  const isZipImport = format === 'bruno-zip';
  const isOpenApiFromUrl = isOpenApi && !!sourceUrl && !filePath;
  const isOpenApiFromFile = isOpenApi && !!filePath && !sourceUrl;
  const isSwagger2 = isOpenApi && rawData?.swagger && String(rawData.swagger).startsWith('2');
  const showCheckForSpecUpdatesOption = isOpenAPISyncEnabled && (isOpenApiFromUrl || isOpenApiFromFile);

  const groupingOptions = [
    { value: 'tags', label: t('IMPORT.TAGS'), description: t('IMPORT.TAGS_DESC'), testId: 'grouping-option-tags' },
    { value: 'path', label: t('IMPORT.PATHS'), description: t('IMPORT.PATHS_DESC'), testId: 'grouping-option-path' }
  ];

  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const preferences = useSelector((state) => state.app.preferences);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);
  const isDefaultWorkspace = !activeWorkspace || activeWorkspace.type === 'default';

  const defaultLocation = isDefaultWorkspace
    ? get(preferences, 'general.defaultLocation', '')
    : (activeWorkspace?.pathname ? path.join(activeWorkspace.pathname, 'collections') : '');

  const collectionName = getCollectionName(format, rawData);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      collectionLocation: defaultLocation
    },
    validationSchema: Yup.object({
      collectionLocation: Yup.string()
        .min(1, t('IMPORT.MIN_1_CHAR'))
        .max(500, t('IMPORT.MAX_500_CHARS'))
        .required(t('IMPORT.LOCATION_REQUIRED'))
    }),
    onSubmit: async (values) => {
      const convertedCollection = await convertCollection(format, rawData, groupingType, collectionFormat);
      const options = { format: collectionFormat };

      if (showCheckForSpecUpdatesOption && enableCheckForSpecUpdates) {
        const syncSourceUrl = sourceUrl || filePath; // URL or absolute path (backend converts to relative)
        const baseBrunoConfig = {
          version: convertedCollection.version || '1',
          name: convertedCollection.name || 'Untitled Collection',
          type: 'collection',
          ignore: ['node_modules', '.git']
        };

        convertedCollection.brunoConfig = {
          ...baseBrunoConfig,
          ...convertedCollection.brunoConfig,
          openapi: [
            {
              sourceUrl: syncSourceUrl,
              groupBy: groupingType,
              autoCheck: true,
              autoCheckInterval: 5
            }
          ]
        };

        options.rawOpenAPISpec = rawContent || rawData;
      }

      handleSubmit(convertedCollection, values.collectionLocation, options);
    }
  });

  const onDropdownCreate = (ref) => {
    dropdownTippyRef.current = ref;
  };

  const GroupingDropdownIcon = forwardRef((props, ref) => {
    const selectedOption = groupingOptions.find((option) => option.value === groupingType);
    return (
      <div ref={ref} className="flex items-center justify-between w-full current-group" data-testid="grouping-dropdown">
        <div>
          <div className="font-medium text-gray-900 dark:text-gray-100">{selectedOption.label}</div>
        </div>
        <IconCaretDown size={16} className="text-gray-400 ml-[0.25rem]" fill="currentColor" />
      </div>
    );
  });
  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        if (typeof dirPath === 'string' && dirPath.length > 0) {
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

  const onSubmit = async () => {
    if (isZipImport) {
      const errors = await formik.validateForm();
      if (Object.keys(errors).length > 0) {
        formik.setTouched({ collectionLocation: true });
        return;
      }
      const collectionLocation = formik.values.collectionLocation;
      handleSubmit(rawData, collectionLocation, { format: collectionFormat, isZipImport: true });
    } else {
      formik.handleSubmit();
    }
  };

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title={t('IMPORT.TITLE')}
        confirmText={t('COMMON.IMPORT')}
        handleConfirm={onSubmit}
        handleCancel={onClose}
        dataTestId="import-collection-location-modal"
      >
        <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="collectionName" className="block font-medium">
              {t('IMPORT.NAME')}
            </label>
            <div className="mt-2">{collectionName}</div>

            <>
              <label htmlFor="collectionLocation" className="font-medium mt-4 flex items-center">
                {t('IMPORT.LOCATION')}
                <Help>
                  <p>{t('IMPORT.BRUNO_STORES_DESC')}</p>
                  <p className="mt-2">{t('IMPORT.CHOOSE_LOCATION_DESC')}</p>
                </Help>
              </label>
              <input
                id="collection-location"
                type="text"
                name="collectionLocation"
                className="block textbox mt-2 w-full cursor-pointer"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                value={formik.values.collectionLocation || ''}
                onClick={browse}
                onChange={(e) => {
                  formik.setFieldValue('collectionLocation', e.target.value);
                }}
              />
            </>
            {formik.touched.collectionLocation && formik.errors.collectionLocation ? (
              <div className="text-red-500">{formik.errors.collectionLocation}</div>
            ) : null}

            <div className="mt-1">
              <span className="text-link cursor-pointer hover:underline" onClick={browse}>
                {t('IMPORT.BROWSE')}
              </span>
            </div>

            {!isZipImport && (
              <div className="mt-4">
                <label htmlFor="format" className="flex items-center font-medium">
                  {t('IMPORT.FILE_FORMAT')}
                  <Help width="300">
                    <p>{t('IMPORT.BRUNO_STORES_DESC')}</p>
                    <p className="mt-2">
                      <strong>{t('IMPORT.FILE_FORMAT_YAML')}:</strong> {t('IMPORT.FILE_FORMAT_YAML_DESC')}
                    </p>
                    <p className="mt-1">
                      <strong>{t('IMPORT.FILE_FORMAT_BRU')}:</strong> {t('IMPORT.FILE_FORMAT_BRU_DESC')}
                    </p>
                  </Help>
                </label>
                <select
                  id="format"
                  name="format"
                  className="block textbox mt-2 w-full"
                  value={collectionFormat}
                  onChange={(e) => setCollectionFormat(e.target.value)}
                >
                  <option value="yml">{t('IMPORT.FILE_FORMAT_YAML')}</option>
                  <option value="bru">{t('IMPORT.FILE_FORMAT_BRU')}</option>
                </select>
              </div>
            )}
          </div>

          {isOpenApi && (
            <div className="mt-4 flex gap-4 items-center justify-between">
              <div>
                <label htmlFor="groupingType" className="block font-medium">
                  {t('IMPORT.FOLDER_ARRANGEMENT')}
                </label>
                <p className="text-muted text-xs mt-1 mb-2">
                  {t('IMPORT.FOLDER_ARRANGEMENT_DESC')}
                </p>
              </div>
              <div className="relative">
                <Dropdown onCreate={onDropdownCreate} icon={<GroupingDropdownIcon />} placement="bottom-start">
                  {groupingOptions.map((option) => (
                    <div
                      key={option.value}
                      className="dropdown-item"
                      data-testid={option.testId}
                      onClick={() => {
                        dropdownTippyRef?.current?.hide();
                        setGroupingType(option.value);
                      }}
                    >
                      {option.label}
                    </div>
                  ))}
                </Dropdown>
              </div>
            </div>
          )}

          {showCheckForSpecUpdatesOption && (
            <div className={`mt-4 ${isSwagger2 ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className={`flex items-center gap-2 ${isSwagger2 ? '' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={isSwagger2 ? false : enableCheckForSpecUpdates}
                  onChange={(e) => setEnableCheckForSpecUpdates(e.target.checked)}
                  disabled={isSwagger2}
                  className={`checkbox ${isSwagger2 ? '' : 'cursor-pointer'}`}
                />
                <span className="font-medium">{t('IMPORT.CHECK_SPEC_UPDATES')}</span>
              </label>
              <p className="text-muted text-xs mt-1">
                {isSwagger2
                  ? t('IMPORT.OPENAPI_SYNC_NOT_SUPPORTED')
                  : t('IMPORT.CHECK_SPEC_UPDATES_DESC')}
              </p>
            </div>
          )}
        </form>
      </Modal>
    </StyledWrapper>
  );
};

export default ImportCollectionLocation;

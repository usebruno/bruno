import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import get from 'lodash/get';
import path from 'utils/common/path';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { postmanToBruno } from 'utils/importers/postman-collection';
import { convertInsomniaToBruno } from 'utils/importers/insomnia-collection';
import { convertOpenapiToBruno, isSwagger2Spec, buildOpenApiSyncBrunoConfig } from 'utils/importers/openapi-collection';
import { processBrunoCollection } from 'utils/importers/bruno-collection';
import { processOpenCollection } from 'utils/importers/opencollection';
import { convertWsdlToBruno } from 'utils/importers/wsdl-collection';
import { toastError } from 'utils/common/error';
import { addLog } from 'providers/ReduxStore/slices/logs';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import Help from 'components/Help';
import ToggleSwitch from 'components/ToggleSwitch';
import ImportSettingRow from 'components/Sidebar/ImportSettingRow';
import FolderArrangementOption from 'components/Sidebar/FolderArrangementOption';
import CheckForSpecUpdatesOption from 'components/Sidebar/CheckForSpecUpdatesOption';
import ImportAdvancedSection from 'components/Sidebar/ImportAdvancedSection';
import AuthPlacementOption from 'components/Sidebar/AuthPlacementOption';
import RequestNameSourceOption from 'components/Sidebar/RequestNameSourceOption';
import ImportOptionsMenu from 'components/Sidebar/ImportOptionsMenu';
import { showImportIssuesToast } from 'components/Toast/ImportIssuesToast';
import { DEFAULT_COLLECTION_FORMAT } from 'utils/common/constants';

// Extract collection name from raw data
const getCollectionName = (format, rawData) => {
  if (!rawData) return 'Collection';

  switch (format) {
    case 'openapi':
      return rawData.info?.title || 'OpenAPI Collection';
    case 'postman':
      return rawData.info?.name || rawData.collection?.info?.name || 'Postman Collection';
    case 'insomnia':
      // For Insomnia v4 format, name is in the workspace resource
      if (rawData.resources && Array.isArray(rawData.resources)) {
        const workspace = rawData.resources.find((r) => r._type === 'workspace');
        if (workspace?.name) {
          return workspace.name;
        }
      }
      // Fallback to root name property
      return rawData.name || 'Insomnia Collection';
    case 'bruno':
      return rawData.name || 'Bruno Collection';
    case 'opencollection':
      return rawData.info?.name || 'OpenCollection';
    case 'wsdl':
      return 'WSDL Collection';
    case 'bruno-zip':
      return rawData.collectionName || 'Bruno Collection';
    default:
      return 'Collection';
  }
};

// Convert raw data to Bruno collection format
// Returns { collection, issues } where issues tracks items that were skipped or degraded
const convertCollection = async (format, rawData, { groupingType, collectionFormat, authPlacement, requestNameSource, preserveScripts, filePath } = {}) => {
  try {
    let collection;
    let issues = [];

    switch (format) {
      case 'openapi':
        collection = convertOpenapiToBruno(rawData, { groupBy: groupingType, collectionFormat, authPlacement, requestNameSource });
        break;
      case 'wsdl':
        collection = await convertWsdlToBruno(rawData, filePath);
        break;
      case 'postman': {
        const result = await postmanToBruno(rawData, { preserveScripts });
        collection = result.collection;
        issues = result.issues || [];
        break;
      }
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
        throw new Error('Unknown collection format');
    }

    return { collection, issues };
  } catch (err) {
    console.error('Conversion error:', err);
    toastError(err, 'Failed to convert collection');
    throw err;
  }
};

const ImportCollectionLocation = ({ onClose, handleSubmit, rawData, format, sourceUrl, filePath, rawContent }) => {
  const inputRef = useRef();
  const dispatch = useDispatch();
  const [groupingType, setGroupingType] = useState('tags');
  const [collectionFormat, setCollectionFormat] = useState(DEFAULT_COLLECTION_FORMAT);
  const [showFileFormat, setShowFileFormat] = useState(false);
  const [enableCheckForSpecUpdates, setEnableCheckForSpecUpdates] = useState(false);
  const [authPlacement, setAuthPlacement] = useState('request');
  const [requestNameSource, setRequestNameSource] = useState('summary');
  const [preserveScripts, setPreserveScripts] = useState(false);
  const isOpenApi = format === 'openapi';
  const isPostman = format === 'postman';
  const isZipImport = format === 'bruno-zip';
  const isOpenApiFromUrl = isOpenApi && !!sourceUrl && !filePath;
  const isOpenApiFromFile = isOpenApi && !!filePath && !sourceUrl;
  const isSwagger2 = isOpenApi && isSwagger2Spec(rawData);
  const showCheckForSpecUpdatesOption = isOpenApiFromUrl || isOpenApiFromFile;

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
        .min(1, 'must be at least 1 character')
        .max(500, 'must be 500 characters or less')
        .required('Location is required')
    }),
    onSubmit: async (values) => {
      const { collection: convertedCollection, issues } = await convertCollection(format, rawData, { groupingType, collectionFormat, authPlacement, requestNameSource, preserveScripts, filePath });
      const options = { format: collectionFormat };

      if (showCheckForSpecUpdatesOption && enableCheckForSpecUpdates) {
        const syncSourceUrl = sourceUrl || filePath; // URL or absolute path (backend converts to relative)
        convertedCollection.brunoConfig = buildOpenApiSyncBrunoConfig(convertedCollection, { sourceUrl: syncSourceUrl, groupBy: groupingType, authPlacement, requestNameSource });
        options.rawOpenAPISpecs = { [convertedCollection.uid]: rawContent || rawData };
      }

      handleSubmit(convertedCollection, values.collectionLocation, options);

      if (issues && issues.length > 0) {
        // Show toast with copy/report actions
        showImportIssuesToast(issues);

        // Log each issue to Bruno's internal console
        const skipped = issues.filter((i) => i.severity === 'error').length;
        const warnings = issues.filter((i) => i.severity === 'warning').length;
        const parts = [];
        if (skipped > 0) parts.push(`skipped ${skipped} item(s)`);
        if (warnings > 0) parts.push(`${warnings} warning(s)`);
        const timestamp = new Date().toISOString();
        dispatch(addLog({ type: 'warn', args: [`Import: ${collectionName} — ${parts.join(', ')}`], timestamp }));
        issues.forEach((issue) => {
          const logType = issue.severity === 'error' ? 'error' : 'warn';
          const logArgs = [`[${issue.path}] ${issue.message}`];
          if (issue.sourceItem) logArgs.push(issue.sourceItem);
          dispatch(addLog({ type: logType, args: logArgs, timestamp }));
        });
      }
    }
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
    <Portal>
      <Modal
        size="md"
        title="Import Collection"
        confirmText="Import"
        handleConfirm={onSubmit}
        handleCancel={onClose}
        dataTestId="import-collection-location-modal"
        footerLeft={
          !isZipImport ? (
            <ImportOptionsMenu showFileFormat={showFileFormat} onToggleFileFormat={() => setShowFileFormat(!showFileFormat)} />
          ) : null
        }
      >
        <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label htmlFor="collectionName" className="block font-medium">
              Name
            </label>
            <div className="mt-2">{collectionName}</div>

            <>
              <label htmlFor="collectionLocation" className="font-medium mt-4 flex items-center">
                Location
                <Help>
                  <p>Bruno stores your collections on your computer's filesystem.</p>
                  <p className="mt-2">Choose the location where you want to store this collection.</p>
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
              <span
                data-testid="import-collection-browse-link"
                className="text-link cursor-pointer hover:underline"
                onClick={browse}
              >
                Browse
              </span>
            </div>

            {showFileFormat && !isZipImport && (
              <div className="mt-4">
                <label htmlFor="format" className="flex items-center font-medium">
                  File Format
                  <Help width="300">
                    <p>Choose the file format for storing requests in this collection.</p>
                    <p className="mt-2">
                      <strong>OpenCollection (YAML):</strong> Industry-standard YAML format (.yml files)
                    </p>
                    <p className="mt-1">
                      <strong>BRU:</strong> Bruno's native file format (.bru files)
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
                  <option value="yml">OpenCollection (YAML)</option>
                  <option value="bru">BRU Format (.bru)</option>
                </select>
              </div>
            )}
          </div>

          {isOpenApi && <FolderArrangementOption className="mt-4" value={groupingType} onChange={setGroupingType} />}
          {showCheckForSpecUpdatesOption && (
            <CheckForSpecUpdatesOption
              className="mt-4"
              checked={!isSwagger2 && enableCheckForSpecUpdates}
              onChange={setEnableCheckForSpecUpdates}
              disabled={isSwagger2}
              showSwagger2Note={isSwagger2}
              testId="check-for-spec-updates-toggle"
            />
          )}
          {isOpenApi && (
            <ImportAdvancedSection>
              <RequestNameSourceOption value={requestNameSource} onChange={setRequestNameSource} />
              <AuthPlacementOption value={authPlacement} onChange={setAuthPlacement} />
            </ImportAdvancedSection>
          )}
          {isPostman && (
            <ImportAdvancedSection>
              <ImportSettingRow label="Preserve scripts" description="Import Postman scripts without translating them." isSwitch>
                <ToggleSwitch
                  isOn={preserveScripts}
                  handleToggle={() => setPreserveScripts(!preserveScripts)}
                  size="2xs"
                  data-testid="preserve-scripts-toggle"
                />
              </ImportSettingRow>
            </ImportAdvancedSection>
          )}
        </form>
      </Modal>
    </Portal>
  );
};

export default ImportCollectionLocation;

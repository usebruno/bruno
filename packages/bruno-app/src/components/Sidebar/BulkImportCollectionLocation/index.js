import React, { useRef, useEffect, useState, useMemo, forwardRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { browseDirectory, importCollection } from 'providers/ReduxStore/slices/collections/actions';
import Modal from 'components/Modal';
import { isElectron } from 'utils/common/platform';
import { IconX, IconLoader2, IconCheck, IconCaretDown } from '@tabler/icons';
import InfoTip from 'components/InfoTip/index';
import Help from 'components/Help';
import { addGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import Dropdown from 'components/Dropdown';
import { postmanToBruno } from 'utils/importers/postman-collection';
import { convertInsomniaToBruno } from 'utils/importers/insomnia-collection';
import { convertOpenapiToBruno } from 'utils/importers/openapi-collection';
import { processBrunoCollection } from 'utils/importers/bruno-collection';
import { wsdlToBruno } from '@usebruno/converters';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import get from 'lodash/get';

const STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

const IMPORT_TYPE = {
  BULK: 'bulk',
  MULTIPLE: 'multiple'
};

const groupingOptions = [
  { value: 'tags', label: 'Tags', description: 'Group requests by OpenAPI tags', testId: 'grouping-option-tags' },
  { value: 'path', label: 'Paths', description: 'Group requests by URL path structure', testId: 'grouping-option-path' }
];

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
    case 'wsdl':
      return 'WSDL Collection';
    default:
      return 'Collection';
  }
};

// Convert raw data to Bruno collection format
const convertCollection = async (format, rawData, groupingType) => {
  let collection;

  switch (format) {
    case 'openapi':
      collection = convertOpenapiToBruno(rawData, { groupBy: groupingType });
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
    default:
      throw new Error('Unknown collection format');
  }

  return collection;
};

export function normalizeName(name) {
  if (typeof name !== 'string') {
    return '';
  }
  return name.trim().toLowerCase();
}

/**
 * Generate a unique name by adding "copy" suffix if the name already exists.
 * @param {string} baseName - The original name
 * @param {function} checkExists - Function that returns true if name exists
 * @returns {string} - Unique name with "copy" suffix if needed
 */
export function generateUniqueName(baseName, checkExists) {
  const normalizedBase = normalizeName(baseName);
  if (!checkExists(normalizedBase)) {
    return baseName;
  }

  let counter = 1;
  let uniqueName = `${baseName} copy`;

  while (checkExists(normalizeName(uniqueName))) {
    counter++;
    uniqueName = `${baseName} copy ${counter}`;
  }

  return uniqueName;
}

export const BulkImportCollectionLocation = ({
  onClose,
  handleSubmit,
  importData
}) => {
  const dispatch = useDispatch();
  const dropdownTippyRef = useRef();

  const { workspaces, activeWorkspaceUid } = useSelector((state) => state.workspaces);
  const preferences = useSelector((state) => state.app.preferences);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);
  const isDefaultWorkspace = !activeWorkspace || activeWorkspace.type === 'default';
  const defaultLocation = isDefaultWorkspace
    ? get(preferences, 'general.defaultCollectionLocation', '')
    : (activeWorkspace?.pathname ? `${activeWorkspace.pathname}/collections` : '');

  const [status, setStatus] = useState({});
  const [errorMessages, setErrorMessages] = useState({});
  const [importStarted, setImportStarted] = useState(false);
  const [environmentStatus, setEnvironmentStatus] = useState({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [selectedError, setSelectedError] = useState(null);
  const [applyToGlobal, setApplyToGlobal] = useState(true);
  const [applyToCollection, setApplyToCollection] = useState(false);
  const [groupingType, setGroupingType] = useState('tags');
  const [collectionFormat, setCollectionFormat] = useState('bru');
  const [renamedCollectionNames, setRenamedCollectionNames] = useState({});
  const [renamedEnvironmentNames, setRenamedEnvironmentNames] = useState({});

  // Extract data based on import type
  const importType = importData?.type;
  const isBulkImport = importType === IMPORT_TYPE.BULK;
  const isMultipleImport = importType === IMPORT_TYPE.MULTIPLE;

  // For bulk import (ZIP files)
  const importedCollectionFromBulk = isBulkImport ? importData.collection : [];
  const importedEnvironmentFromBulk = isBulkImport ? (importData.environment || []) : [];

  // For multiple files import
  const filesData = isMultipleImport ? importData.filesData : [];
  const hasOpenApiSpec = filesData.some((f) => f.type === 'openapi');

  // Create unified collection structure for display
  const importedCollection = isMultipleImport
    ? filesData.map((fileData, index) => ({
        uid: `file-${index}`,
        name: getCollectionName(fileData.type, fileData.data),
        _fileData: fileData
      }))
    : importedCollectionFromBulk;

  const importedEnvironment = isBulkImport ? importedEnvironmentFromBulk : [];

  const globalEnvironments = useSelector((state) => state?.globalEnvironments?.globalEnvironments);
  const existingCollections = useSelector((state) => state?.collections?.collections || []);

  // Initialize selected items based on import type
  const [selectedCollections, setSelectedCollections] = useState(importedCollection.map((col) => col.uid));
  const [selectedEnvironments, setSelectedEnvironments] = useState(isBulkImport ? importedEnvironmentFromBulk.map((env) => env.uid) : []);

  const allCollectionsSelected = selectedCollections.length === importedCollection.length;
  const allEnvironmentsSelected = selectedEnvironments.length === importedEnvironment.length;

  // Sort collections to show selected items first, then unselected items
  // This helps users see their selections at the top of the list
  const sortedCollections = useMemo(() => {
    const arr = [...importedCollection];
    arr.sort((a, b) => {
      const aSelected = selectedCollections.includes(a.uid);
      const bSelected = selectedCollections.includes(b.uid);
      // Convert boolean to number: true = 1, false = 0
      // bSelected - aSelected means: selected items (1) come before unselected (0)
      return Number(bSelected) - Number(aSelected);
    });
    return arr;
  }, [importedCollection, selectedCollections]);

  // Sort environments to show selected items first, then unselected items
  // This helps users see their selections at the top of the list
  const sortedEnvironments = useMemo(() => {
    const arr = [...importedEnvironment];
    arr.sort((a, b) => {
      const aSelected = selectedEnvironments.includes(a.uid);
      const bSelected = selectedEnvironments.includes(b.uid);
      // selected (true) should come before unselected (false)
      return Number(bSelected) - Number(aSelected);
    });
    return arr;
  }, [importedEnvironment, selectedEnvironments]);

  const importStatus = useMemo(() => {
    const selectedSet = new Set(selectedCollections);
    const totalSelected = selectedCollections.length;
    const failedCount = Object.entries(status).reduce((acc, [uid, s]) => {
      return selectedSet.has(uid) && s === STATUS.ERROR ? acc + 1 : acc;
    }, 0);

    return {
      totalSelected,
      failedCount
    };
  }, [status, selectedCollections]);

  // Handlers
  const handleCollectionToggle = (uid) => {
    setSelectedCollections((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };
  const handleEnvironmentToggle = (uid) => {
    setSelectedEnvironments((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };
  const handleSelectAllCollections = (e) => {
    setSelectedCollections(e.target.checked ? importedCollection.map((col) => col.uid) : []);
  };
  const handleSelectAllEnvironments = (e) => {
    setSelectedEnvironments(
      e.target.checked ? importedEnvironment.map((env) => env.uid) : []
    );
  };

  const onDropdownCreate = (ref) => {
    dropdownTippyRef.current = ref;
  };

  const GroupingDropdownIcon = forwardRef((props, ref) => {
    const selectedOption = groupingOptions.find((option) => option.value === groupingType);
    return (
      <div ref={ref} className="flex items-center justify-between w-full current-group" data-testid="grouping-dropdown">
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedOption.label}</div>
        </div>
        <IconCaretDown size={16} className="text-gray-400 ml-[0.25rem]" fill="currentColor" />
      </div>
    );
  });

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
      let filteredCollections = [];
      const selectedItems = importedCollection.filter((col) => selectedCollections.includes(col.uid));

      if (isMultipleImport) {
        // Convert selected files to collections at submit time
        for (const item of selectedItems) {
          try {
            const collection = await convertCollection(item._fileData.type, item._fileData.data, groupingType);
            if (collection) {
              // Preserve the synthetic UID so status tracking, rename tracking,
              // and UI rendering all use the same key
              collection.uid = item.uid;
              filteredCollections.push(collection);
            }
          } catch (err) {
            console.warn(`Failed to convert file ${item._fileData.file.name}:`, err);
          }
        }
      } else if (isBulkImport) {
        // For bulk import, use selected collections directly
        filteredCollections = selectedItems;
      }

      const initialStatus = {};
      filteredCollections.forEach((col) => {
        initialStatus[col.uid] = STATUS.LOADING;
      });

      setStatus(initialStatus);
      setErrorMessages({});

      const filteredEnvironments = importedEnvironment.filter((env) =>
        selectedEnvironments.includes(env.uid)
      );

      // Handle duplicate collection names by renaming new ones to a unique "{originalName} N" suffix
      const existingCollectionNames = new Set(existingCollections.map((col) => normalizeName(col.name)));
      const usedNames = new Set();
      const renamedNames = {};

      filteredCollections.forEach((collection) => {
        const originalName = collection.name;
        let finalName = originalName;
        let index = 0;

        while (existingCollectionNames.has(normalizeName(finalName)) || usedNames.has(normalizeName(finalName))) {
          finalName = `${originalName} ${index + 1}`;
          index++;
        }

        collection.name = finalName;
        usedNames.add(normalizeName(finalName));
        // Store renamed name for summary display
        if (finalName !== originalName) {
          renamedNames[collection.uid] = finalName;
        }
      });

      setRenamedCollectionNames(renamedNames);

      // Process all selected environments and rename duplicates
      // Don't use getUniqueEnvironments as it filters out duplicates - we want to rename them instead
      const collectionRenamedEnvNames = {};
      const globalRenamedEnvNames = {};

      if (applyToCollection) {
        // add selected environments to each selected collection
        // Rename duplicates with "copy" suffix instead of filtering them out
        filteredCollections.forEach((collection) => {
          const existingNamesSet = new Set((collection.environments || []).map((e) => normalizeName(e?.name)));
          const usedNamesInBatch = new Set();

          const envsForCollection = filteredEnvironments.map((env) => {
            const originalName = env.name;
            const normalizedOriginalName = normalizeName(originalName);

            // Check if name exists in collection or was already used in this batch
            const checkExists = (name) => existingNamesSet.has(name) || usedNamesInBatch.has(name);
            const finalName = generateUniqueName(originalName, checkExists);

            // Track renamed name for summary display
            if (finalName !== originalName) {
              collectionRenamedEnvNames[env.uid] = finalName;
            }

            usedNamesInBatch.add(normalizedOriginalName);
            existingNamesSet.add(normalizeName(finalName));
            return { ...env, name: finalName };
          });

          collection.environments = envsForCollection;
        });

        // Mark all collection environments as success (they're processed with the collection import)
        const envStatusUpdate = {};
        filteredEnvironments.forEach((env) => {
          envStatusUpdate[env.uid] = STATUS.SUCCESS;
        });
        setEnvironmentStatus((prev) => ({ ...prev, ...envStatusUpdate }));

        if (Object.keys(collectionRenamedEnvNames).length > 0) {
          setRenamedEnvironmentNames((prev) => ({ ...prev, ...collectionRenamedEnvNames }));
        }
      }

      if (applyToGlobal && filteredEnvironments.length > 0) {
        // Pre-compute unique names for all environments to avoid race conditions
        const existingGlobalNames = new Set((globalEnvironments || []).map((env) => normalizeName(env?.name)));
        const usedNamesInBatch = new Set();
        const envsToImport = [];

        filteredEnvironments.forEach((environment) => {
          const checkExists = (name) => existingGlobalNames.has(name) || usedNamesInBatch.has(name);
          const uniqueName = generateUniqueName(environment.name, checkExists);

          if (uniqueName !== environment.name) {
            globalRenamedEnvNames[environment.uid] = uniqueName;
          }
          usedNamesInBatch.add(normalizeName(uniqueName));
          envsToImport.push({ ...environment, name: uniqueName });
        });

        if (Object.keys(globalRenamedEnvNames).length > 0) {
          setRenamedEnvironmentNames((prev) => ({ ...prev, ...globalRenamedEnvNames }));
        }

        envsToImport.forEach((envToImport) => {
          const originalUid = envToImport.uid;
          setEnvironmentStatus((prev) => ({ ...prev, [originalUid]: STATUS.LOADING }));

          dispatch(addGlobalEnvironment(envToImport))
            .then(() => setEnvironmentStatus((prev) => ({ ...prev, [originalUid]: STATUS.SUCCESS })))
            .catch((error) => {
              setEnvironmentStatus((prev) => ({ ...prev, [originalUid]: STATUS.ERROR }));
              setErrorMessages((prev) => ({ ...prev, [originalUid]: error.message || 'Failed to add environment' }));
            });
        });
      }

      setImportStarted(true);

      if (filteredCollections.length > 1 || isBulkImport || isMultipleImport) {
        dispatch(importCollection(filteredCollections, values.collectionLocation, { format: collectionFormat }))
          .catch((err) => {
            console.error('Failed to import collections', err);
            filteredCollections.forEach((collection) => {
              setStatus((prev) => ({ ...prev, [collection.uid]: STATUS.ERROR }));
              setErrorMessages((prev) => ({ ...prev, [collection.uid]: err.message || 'Failed to import collection' }));
            });
          });
      } else {
        handleSubmit(filteredCollections[0], values.collectionLocation, { format: collectionFormat });
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
    if (!isElectron()) {
      return () => {};
    }

    const { ipcRenderer } = window;

    const handleImportStatus = (collectionId, status, errorMessage = '') => {
      setStatus((prev) => ({ ...prev, [collectionId]: status }));
      if (status === STATUS.ERROR) {
        setErrorMessages((prev) => ({
          ...prev,
          [collectionId]: errorMessage
        }));
      }
    };

    const importingCollectionStarted = ipcRenderer.on(
      'main:collection-import-started',
      (collectionId) => {
        handleImportStatus(collectionId, STATUS.LOADING);
      }
    );
    const importingCollectionCompleted = ipcRenderer.on(
      'main:collection-import-ended',
      (collectionId) => {
        handleImportStatus(collectionId, STATUS.SUCCESS);
      }
    );
    const importingCollectionFailed = ipcRenderer.on(
      'main:collection-import-failed',
      (collectionId, { message }) => {
        handleImportStatus(collectionId, STATUS.ERROR, message);
      }
    );
    const allCollectionsImportCompleted = ipcRenderer.on(
      'main:all-collections-import-ended',
      (report) => {
        toast.success(report?.message);
      }
    );
    return () => {
      importingCollectionStarted();
      importingCollectionCompleted();
      importingCollectionFailed();
      allCollectionsImportCompleted();
    };
  }, []);

  const onSubmit = () => {
    if (importStarted) {
      onClose();
    } else {
      formik.handleSubmit();
    }
  };

  const handleErrorClick = (error, uid) => {
    setSelectedError({ message: error, uid });
    setShowErrorModal(true);
  };

  const ErrorModal = ({ error, onClose }) => (
    <Modal
      size="sm"
      title="Error Details"
      handleConfirm={onClose}
      handleCancel={onClose}
      showCancelButton={false}
      disableCloseOnOutsideClick={true}
      hideFooter={true}
    >
      <div className="p-4">
        <pre className="whitespace-pre-wrap text-red-600 text-sm">{error}</pre>
      </div>
    </Modal>
  );

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title="Bulk Import"
        confirmText={importStarted ? 'Close' : 'Import'}
        confirmDisabled={Boolean(!selectedCollections?.length)}
        handleConfirm={onSubmit}
        handleCancel={onClose}
        showConfirm={true}
        disableCloseOnOutsideClick={true}
        disableEscapeKey={false}
        hideCancel={importStarted}
      >
        <form className="bruno-form" onSubmit={(e) => e.preventDefault()}>
          <div className="flex flex-col">
            {importStarted ? (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between relative mb-5 w-full">
                    <div className="font-semibold">Location</div>
                    <div className="text-sm border border-slate-600 rounded px-3 py-1.5 ml-4 flex-1">
                      {formik.values.collectionLocation
                        || 'No location selected'}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">
                      Importing Collections ({importStatus.totalSelected})
                    </div>
                    {importStatus.failedCount > 0 && importStatus.totalSelected > 0 && (
                      <div className="text-sm text-red-500">
                        ({importStatus.failedCount}/{importStatus.totalSelected} failed)
                      </div>
                    )}
                  </div>
                  <div className="max-h-[180px] overflow-y-scroll border border-slate-600 rounded-md py-2 scrollbar-visible">
                    {sortedCollections
                      .filter((collection) =>
                        selectedCollections.includes(collection.uid)
                      )
                      .map((collection) => (
                        <div
                          key={collection.uid}
                          className="flex items-center px-4 py-1.5 text-sm font-normal justify-between"
                        >
                          <div className="flex items-center flex-1">
                            <div className="flex items-center mr-2">
                              {status[collection.uid] === STATUS.LOADING && (
                                <IconLoader2
                                  className="animate-spin text-blue-500"
                                  size={16}
                                  strokeWidth={1.5}
                                />
                              )}
                              {status[collection.uid] === STATUS.SUCCESS && (
                                <div className="flex items-center text-green-500">
                                  <IconCheck size={16} strokeWidth={1.5} />
                                </div>
                              )}
                              {status[collection.uid] === STATUS.ERROR && (
                                <div className="flex items-center">
                                  <IconX
                                    className="text-red-500"
                                    size={16}
                                    strokeWidth={1.5}
                                  />
                                </div>
                              )}
                            </div>
                            <span>{renamedCollectionNames[collection.uid] || collection.name}</span>
                          </div>
                          {status[collection.uid] === STATUS.ERROR && (
                            <button
                              onClick={() =>
                                handleErrorClick(
                                  errorMessages[collection.uid],
                                  collection.uid
                                )}
                              className="text-red-500 text-sm hover:underline"
                            >
                              See error
                            </button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {selectedEnvironments.length > 0 && (
                  <div className="mb-6">
                    <div className="font-semibold mb-2">
                      Importing Environments ({selectedEnvironments.length})
                    </div>
                    <div className="max-h-[180px] overflow-y-scroll border border-slate-600 rounded-md py-2 scrollbar-visible">
                      {sortedEnvironments
                        .filter((env) => selectedEnvironments.includes(env.uid))
                        .map((env) => (
                          <div
                            key={env.uid}
                            className="flex items-center px-4 py-1.5 text-sm font-normal justify-between"
                          >
                            <div className="flex items-center flex-1">
                              <div className="flex items-center mr-2">
                                {!environmentStatus[env.uid] || environmentStatus[env.uid] === STATUS.LOADING ? (
                                  <IconLoader2
                                    className="animate-spin text-blue-500"
                                    size={16}
                                    strokeWidth={1.5}
                                  />
                                ) : environmentStatus[env.uid] === STATUS.SUCCESS ? (
                                  <div className="flex items-center text-green-500">
                                    <IconCheck size={16} strokeWidth={1.5} />
                                  </div>
                                ) : environmentStatus[env.uid] === STATUS.ERROR ? (
                                  <div className="flex items-center">
                                    <IconX
                                      className="text-red-500"
                                      size={16}
                                      strokeWidth={1.5}
                                    />
                                  </div>
                                ) : null}
                              </div>
                              <span>{renamedEnvironmentNames[env.uid] || env.name}</span>
                            </div>
                            {environmentStatus[env.uid] === STATUS.ERROR && (
                              <button
                                onClick={() =>
                                  handleErrorClick(
                                    errorMessages[env.uid],
                                    env.uid
                                  )}
                                className="text-red-500 text-sm hover:underline"
                              >
                                See error
                              </button>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-6">
                  <div className="font-semibold mb-2 flex justify-between items-center">
                    <span>Collections ({importedCollection.length})</span>
                    <label className="flex items-center text-sm font-normal select-none cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allCollectionsSelected}
                        onChange={handleSelectAllCollections}
                        className="mr-2"
                      />
                      Select All
                    </label>
                  </div>
                  <div className="max-h-[180px] overflow-y-scroll border border-slate-600 rounded-md py-2">
                    {importedCollection.length === 0 && (
                      <div className="px-4 py-2 text-gray-400 italic">
                        No collections found
                      </div>
                    )}
                    {sortedCollections.map((collection) => (
                      <label
                        key={collection.uid}
                        className="flex items-center px-4 py-1.5 text-sm font-normal select-none cursor-pointer justify-between"
                      >
                        <div className="flex items-center flex-1">
                          <input
                            type="checkbox"
                            checked={selectedCollections.includes(collection.uid)}
                            onChange={() => handleCollectionToggle(collection.uid)}
                            className="mr-3"
                          />
                          <span>{collection.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {importType === 'bulk' && (
                  <>
                    <div className="mb-4">
                      <div className="font-semibold mb-2 flex justify-between items-center">
                        <span>Environments ({importedEnvironment.length})</span>
                        <label className="flex items-center text-sm font-normal select-none cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allEnvironmentsSelected}
                            onChange={handleSelectAllEnvironments}
                            className="mr-2"
                          />
                          Select All
                        </label>
                      </div>
                      <div className="max-h-[180px] overflow-y-scroll border border-slate-600 rounded-md py-2 scrollbar-visible">
                        {importedEnvironment.length === 0 && (
                          <div className="px-4 py-2 text-gray-400 italic">
                            No environments found
                          </div>
                        )}
                        {sortedEnvironments.map((env) => (
                          <label
                            key={env.uid}
                            className="flex items-center px-4 py-1.5 text-sm font-normal select-none cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedEnvironments.includes(env.uid)}
                              onChange={() => handleEnvironmentToggle(env.uid)}
                              className="mr-3"
                            />
                            <span>{env.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="font-semibold mb-2">
                        Environment Assignment
                      </div>
                      <div className="flex gap-8 mt-2 ml-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={applyToGlobal}
                            onChange={(e) => setApplyToGlobal(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="ml-2">
                            Global Environment
                            <InfoTip
                              content="Environments will be imported and stored as global, accessible across collections."
                              infotipId="apply-to-global-infotip"
                            />
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={applyToCollection}
                            onChange={(e) =>
                              setApplyToCollection(e.target.checked)}
                            className="mr-2"
                          />
                          <span className="ml-2">
                            Duplicate Across Collections
                            <InfoTip
                              content="Each imported collection will receive its own copy of the environments."
                              infotipId="apply-to-each-infotip"
                            />
                          </span>
                        </label>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex items-start flex-col relative">
                  <div className="font-semibold mb-2">Location</div>
                  <input
                    id="collection-location"
                    type="text"
                    placeholder="Select a location to save the collection"
                    name="collectionLocation"
                    className="block textbox w-full cursor-pointer"
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
                  {formik.touched.collectionLocation && formik.errors.collectionLocation ? (
                    <div className="text-red-500 mt-1">
                      {formik.errors.collectionLocation}
                    </div>
                  ) : null}
                  <div className="mt-1">
                    <span className="text-link cursor-pointer hover:underline" onClick={browse}>
                      Browse
                    </span>
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="format" className="flex items-center font-semibold">
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

                {isMultipleImport && hasOpenApiSpec && (
                  <div>
                    <div className="flex gap-4 items-center">
                      <div>
                        <label htmlFor="groupingType" className="block font-semibold">
                          Folder arrangement
                        </label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-2">
                          Select whether to create folders according to the spec's paths or tags.
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
                  </div>
                )}
              </>
            )}
          </div>
        </form>
      </Modal>

      {showErrorModal && (
        <ErrorModal
          error={selectedError?.message}
          onClose={() => setShowErrorModal(false)}
        />
      )}
    </StyledWrapper>
  );
};

export default BulkImportCollectionLocation;

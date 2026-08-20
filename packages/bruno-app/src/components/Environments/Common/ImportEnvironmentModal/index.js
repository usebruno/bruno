import React, { useState } from 'react';
import CountBadge from 'ui/CountBadge';
import MenuDropdown from 'ui/MenuDropdown';
import { DropdownTrigger, ResolutionButton, StyledWrapper } from './StyledWrapper';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import Checkbox from 'components/Checkbox';
import SearchInput from 'components/SearchInput';
import IconAlertTriangleFilled from 'components/Icons/IconAlertTriangleFilled';
import IconFileAlertFilled from 'components/Icons/IconFileAlertFilled';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import importPostmanEnvironment from 'utils/importers/postman-environment';
import importBrunoEnvironment from 'utils/importers/bruno-environment';
import { readMultipleFiles } from 'utils/importers/file-reader';
import { importEnvironment, saveEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { addGlobalEnvironment, saveGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { toastError } from 'utils/common/error';
import {
  IconFileImport,
  IconChevronDown,
  IconChevronRight,
  IconCopy,
  IconArrowsExchange
} from '@tabler/icons';
import { useTheme } from 'styled-components';
import { pluralizeWord } from 'utils/common/index';
const generateCopyName = (baseName, existingNames) => {
  let counter = 1;
  let newName = `${baseName} copy`;
  while (existingNames.includes(newName)) {
    counter++;
    newName = `${baseName} copy ${counter}`;
  }
  return newName;
};

const ImportEnvironmentModal = ({ type = 'collection', collection, onClose, onEnvironmentCreated }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const [isDragOver, setIsDragOver] = useState(false);
  const [step, setStep] = useState('UPLOAD'); // 'UPLOAD' | 'REVIEW'
  const [parsedData, setParsedData] = useState({ new: [], duplicates: [], invalid: [] });
  // Set of indices from the valid items array (which is new + duplicates)
  const [selectedIndices, setSelectedIndices] = useState(new Set());
  // Mapping of duplicate name -> 'copy' | 'replace'
  const [resolutions, setResolutions] = useState({});
  const [searchText, setSearchText] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({ invalid: true, duplicates: true, new: true });

  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const isGlobal = type === 'global';

  if (!isGlobal && !collection) {
    console.error('ImportEnvironmentModal: collection prop is required when type is "collection"');
    return null;
  }
  const modalTitle = isGlobal ? 'Import Global Environment' : 'Import Environment';
  const modalTestId = isGlobal ? 'import-global-environment-modal' : 'import-environment-modal';
  const importTestId = isGlobal ? 'import-global-environment' : 'import-environment';

  const existingEnvironments = isGlobal ? globalEnvironments : (collection?.environments || []);
  const existingNames = existingEnvironments.map((e) => e.name);

  const detectEnvironmentFormat = (data) => {
    if (data.info && data.info.type === 'bruno-environment') {
      return 'bruno';
    } else if (Array.isArray(data)) {
      return data.some((env) => env.info && env.info.type === 'bruno-environment') ? 'bruno' : 'postman';
    } else if (data.id && data.values) {
      return 'postman';
    }
    return 'bruno';
  };

  const handleImportEnvironment = async (files) => {
    try {
      const { parsedFiles, invalidFiles } = await readMultipleFiles(Array.from(files));

      const filesByFormat = parsedFiles.reduce((acc, file) => {
        const format = detectEnvironmentFormat(file.content);
        (acc[format] = acc[format] || []).push(file);
        return acc;
      }, {});

      const results = await Promise.all(
        Object.entries(filesByFormat).map(([format, filesForFormat]) =>
          format === 'postman' ? importPostmanEnvironment(filesForFormat) : importBrunoEnvironment(filesForFormat)
        )
      );

      const result = {
        valid: results.flatMap((r) => r.valid),
        invalid: results.flatMap((r) => r.invalid)
      };

      const validEnvironments = result.valid.filter((env) => env.name && env.name !== 'undefined');
      const missingNameEnvs = result.valid
        .filter((env) => !env.name || env.name === 'undefined')
        .map((env) => ({ fileName: env.fileName || 'Unknown', error: 'Environment has no name' }));

      const allInvalid = [...invalidFiles, ...result.invalid, ...missingNameEnvs];

      const duplicates = validEnvironments.filter((e) => existingNames.includes(e.name));
      const newEnvs = validEnvironments.filter((e) => !existingNames.includes(e.name));

      setParsedData({ new: newEnvs, duplicates, invalid: allInvalid });

      // Initialize selected set
      const initialSelected = new Set();
      validEnvironments.forEach((_, idx) => initialSelected.add(idx));
      setSelectedIndices(initialSelected);

      // Initialize resolutions for duplicates to 'copy' by default
      const initialResolutions = {};
      duplicates.forEach((e) => {
        initialResolutions[e.name] = 'copy';
      });
      setResolutions(initialResolutions);

      setStep('REVIEW');
    } catch (err) {
      toastError(err, 'Import environment failed');
    }
  };

  const handleConfirmImport = async () => {
    const validEnvironments = [...parsedData.new, ...parsedData.duplicates];
    const environmentsToImport = validEnvironments.filter((_, idx) => selectedIndices.has(idx));

    if (environmentsToImport.length === 0) {
      toast.error('No environments selected to import');
      return;
    }

    try {
      let importedCount = 0;
      const currentExistingNames = [...existingNames];

      for (const environment of environmentsToImport) {
        const isDuplicate = parsedData.duplicates.includes(environment);
        let action;

        if (isDuplicate) {
          const resolution = resolutions[environment.name] || 'copy';
          if (resolution === 'replace') {
            const existingEnv = existingEnvironments.find((e) => e.name === environment.name);
            if (existingEnv) {
              action = isGlobal
                ? saveGlobalEnvironment({ variables: environment.variables, environmentUid: existingEnv.uid })
                : saveEnvironment(environment.variables, existingEnv.uid, collection.uid);
            }
          } else {
            // copy
            const copyName = generateCopyName(environment.name, currentExistingNames);
            currentExistingNames.push(copyName);
            action = isGlobal
              ? addGlobalEnvironment({ name: copyName, variables: environment.variables, color: environment.color })
              : importEnvironment({ name: copyName, variables: environment.variables, color: environment.color, collectionUid: collection?.uid });
          }
        } else {
          const name = currentExistingNames.includes(environment.name)
            ? generateCopyName(environment.name, currentExistingNames)
            : environment.name;
          currentExistingNames.push(name);
          action = isGlobal
            ? addGlobalEnvironment({ name, variables: environment.variables, color: environment.color })
            : importEnvironment({ name, variables: environment.variables, color: environment.color, collectionUid: collection?.uid });
        }

        if (action) {
          await dispatch(action);
          importedCount++;
        }
      }

      toast.success(`${importedCount > 1 ? `${importedCount} environments` : 'Environment'} imported successfully`);
      onClose();
      if (onEnvironmentCreated) {
        onEnvironmentCreated();
      }
    } catch (error) {
      toastError(error, 'An error occurred while importing the environment(s)');
    }
  };

  // Drag and drop handlers
  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.json';
    input.onchange = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImportEnvironment(e.target.files);
      }
    };
    input.click();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImportEnvironment(files);
    }
  };

  // Review handlers

  const toggleItemSelection = (env) => {
    const validEnvironments = [...parsedData.new, ...parsedData.duplicates];
    const idx = validEnvironments.indexOf(env);
    if (idx !== -1) {
      const newSelected = new Set(selectedIndices);
      if (newSelected.has(idx)) newSelected.delete(idx);
      else newSelected.add(idx);
      setSelectedIndices(newSelected);
    }
  };

  const setGroupResolution = (res) => {
    const newResolutions = { ...resolutions };
    parsedData.duplicates.forEach((env) => {
      newResolutions[env.name] = res;
    });
    setResolutions(newResolutions);
  };

  const setItemResolution = (envName, res) => {
    setResolutions({ ...resolutions, [envName]: res });
  };

  const toggleGroupExpanded = (group) => {
    setExpandedGroups({ ...expandedGroups, [group]: !expandedGroups[group] });
  };

  // Filtering
  const filteredNew = parsedData.new.filter((env) => env.name.toLowerCase().includes(searchText.toLowerCase()));
  const filteredDuplicates = parsedData.duplicates.filter((env) => env.name.toLowerCase().includes(searchText.toLowerCase()));

  const totalEnvironments = parsedData.new.length + parsedData.duplicates.length;
  const totalParsedCount = totalEnvironments + parsedData.invalid.length;

  if (step === 'UPLOAD') {
    return (
      <Portal>
        <Modal
          size="md"
          title={modalTitle}
          hideFooter={true}
          handleConfirm={onClose}
          handleCancel={onClose}
          dataTestId={modalTestId}
          disableCloseOnOutsideClick
        >
          <StyledWrapper>
            <div className="upload-container">
              <div
                className={`upload-dropzone ${isDragOver ? 'is-drag-over' : ''}`}
                onClick={handleFileSelect}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-testid={importTestId}
              >
                <IconFileImport size={64} className="upload-dropzone-icon" />
                <span className="upload-dropzone-title">
                  {isDragOver ? 'Drop your environment files here' : 'Import your environments'}
                </span>
                <span className="upload-dropzone-subtitle">
                  Drag & drop JSON files/folders or click to browse. Supports both Bruno and Postman formats.
                </span>
              </div>
            </div>
          </StyledWrapper>
        </Modal>
      </Portal>
    );
  }

  const getDropdownValue = () => {
    if (parsedData.duplicates.length === 0) return 'Custom';
    const allCopy = parsedData.duplicates.every((env) => resolutions[env.name] === 'copy');
    if (allCopy) return 'copy';
    const allReplace = parsedData.duplicates.every((env) => resolutions[env.name] === 'replace');
    if (allReplace) return 'replace';
    return 'Custom';
  };

  const isAllSelected = selectedIndices.size === totalEnvironments && totalEnvironments > 0;
  const toggleSelectAll = (checked) => {
    if (checked) {
      const allSelected = new Set();
      for (let i = 0; i < totalEnvironments; i++) {
        allSelected.add(i);
      }
      setSelectedIndices(allSelected);
    } else {
      setSelectedIndices(new Set());
    }
  };

  return (
    <Portal>
      <Modal
        size="md"
        title={modalTitle}
        confirmText="Import"
        cancelText="Cancel"
        handleConfirm={handleConfirmImport}
        handleCancel={onClose}
        dataTestId={modalTestId}
        disableCloseOnOutsideClick
        confirmDisabled={totalEnvironments === 0}
        footerLeft={(
          <div className="footer-left-content">
            <span style={{ color: theme.brand }}>{selectedIndices.size}</span> of {totalEnvironments} selected
          </div>
        )}
      >
        <StyledWrapper>
          <div className="modal-content">
            <div className="modal-header">
              Environments <CountBadge size="md" className="ml-2" data-testid="env-import-total-count">{totalParsedCount}</CountBadge>
            </div>

            <div className="scroll-area">
              <div className="environments-list-container">
                {(parsedData.duplicates.length > 0 || parsedData.invalid.length > 0) && (
                  <div className="warning-block">
                    {parsedData.duplicates.length > 0 && (
                      <div className="warning-header">
                        <IconAlertTriangleFilled size={16} className="mr-2 warning-icon" />
                        <span className="warning-title">{parsedData.duplicates.length} {pluralizeWord('environment', parsedData.duplicates.length)}&nbsp;</span> already {parsedData.duplicates.length > 1 ? 'exist' : 'exists'} with the same name
                      </div>
                    )}
                    {parsedData.invalid.length > 0 && (
                      <div className="warning-header danger">
                        <IconFileAlertFilled size={16} className="mr-2 error-icon" />
                        <span className="warning-title">{parsedData.invalid.length} {pluralizeWord('file', parsedData.invalid.length)}&nbsp;</span> {parsedData.invalid.length > 1 ? 'have' : 'has'} an invalid or unsupported format
                      </div>
                    )}
                  </div>
                )}

                <div className="search-block">
                  <div className="search-input-wrapper">
                    <SearchInput
                      searchText={searchText}
                      setSearchText={setSearchText}
                      placeholder="Search environments"
                      className="w-full h-[30px] !px-0"
                      leftIconClassName="!pl-2"
                      data-testid="env-search-input"
                      autoFocus={false}
                      inputClassName="h-[30px] text-xs"
                      iconSize={13}
                    />
                  </div>
                  <div className="select-all-wrapper" onClick={() => toggleSelectAll(!isAllSelected)}>
                    <Checkbox
                      className="select-all-checkbox"
                      checked={isAllSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      dataTestId="env-import-select-all"
                    />
                    <span className="select-all-text">Select all</span>
                  </div>
                </div>

                {/* Invalid Group */}
                {parsedData.invalid.length > 0 && (
                  <div className={`group-container ${(parsedData.duplicates.length > 0 || parsedData.new.length > 0) ? 'has-border-bottom' : ''}`}>
                    <div className="group-header">
                      <div className="group-title-wrapper" onClick={() => toggleGroupExpanded('invalid')}>
                        {expandedGroups.invalid ? <IconChevronDown size={16} className="text-zinc-500" /> : <IconChevronRight size={16} className="text-zinc-500" />}
                        <span className="group-title">Invalid or unsupported</span>
                        <CountBadge variant="danger" className="ml-2" data-testid="env-import-invalid-count">{parsedData.invalid.length}</CountBadge>
                      </div>
                    </div>
                    {expandedGroups.invalid && (
                      <div className="group-list">
                        {parsedData.invalid.map((item, idx) => (
                          <div key={idx} className="env-item" data-testid="env-import-invalid-item">
                            <div className="env-item-content">
                              <div className="env-name">{item.fileName}</div>
                              <div className="env-error">{item.error}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Duplicates Group */}
                {parsedData.duplicates.length > 0 && (
                  <div className={`group-container ${parsedData.new.length > 0 ? 'has-border-bottom' : ''}`}>
                    <div className="group-header">
                      <div className="group-title-wrapper" onClick={() => toggleGroupExpanded('duplicates')}>
                        {expandedGroups.duplicates ? <IconChevronDown size={16} className="text-zinc-500" /> : <IconChevronRight size={16} className="text-zinc-500" />}
                        <span className="group-title">Duplicates</span>
                        <CountBadge variant="warning" className="ml-2" data-testid="env-import-duplicates-count">{parsedData.duplicates.length}</CountBadge>
                      </div>
                      <MenuDropdown
                        items={[
                          { id: 'copy', label: 'Import as copy', onClick: () => setGroupResolution('copy') },
                          { id: 'replace', label: 'Replace existing', onClick: () => setGroupResolution('replace') }
                        ]}
                        selectedItemId={getDropdownValue() !== 'Custom' ? getDropdownValue() : null}
                      >
                        <DropdownTrigger data-testid="env-import-group-dropdown">
                          <span>
                            {getDropdownValue() === 'Custom' ? 'Custom' : getDropdownValue() === 'copy' ? 'Import as copy' : 'Replace existing'}
                          </span>
                          <IconChevronDown size={14} className="icon-chevron" />
                        </DropdownTrigger>
                      </MenuDropdown>
                    </div>
                    {expandedGroups.duplicates && (
                      <div className="group-list">
                        {filteredDuplicates.map((env, idx) => {
                          const globalIdx = [...parsedData.new, ...parsedData.duplicates].indexOf(env);
                          const isSelected = selectedIndices.has(globalIdx);
                          const resolution = resolutions[env.name];
                          return (
                            <div key={idx} className="env-item group" data-testid="env-import-item">
                              <label className="env-item-label">
                                <Checkbox
                                  className="env-item-checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleItemSelection(env)}
                                  dataTestId="env-import-item-checkbox"
                                />
                                <div className="env-item-content">
                                  <div className="env-name">{env.name}</div>
                                  {(env.filePath || env.fileName) && (
                                    <div className="env-filepath" title={env.filePath || env.fileName}>
                                      {env.filePath || env.fileName}
                                    </div>
                                  )}
                                </div>
                              </label>
                              <div className="env-actions">
                                <ResolutionButton
                                  $selected={resolution === 'copy'}
                                  onClick={() => setItemResolution(env.name, 'copy')}
                                  title="Import as copy"
                                  data-testid="env-import-copy-btn"
                                >
                                  <IconCopy size={16} />
                                </ResolutionButton>
                                <ResolutionButton
                                  $selected={resolution === 'replace'}
                                  onClick={() => setItemResolution(env.name, 'replace')}
                                  title="Replace existing"
                                  data-testid="env-import-replace-btn"
                                >
                                  <IconArrowsExchange size={16} />
                                </ResolutionButton>
                              </div>
                            </div>
                          );
                        })}
                        {filteredDuplicates.length === 0 && searchText && (
                          <div className="empty-state">No matching duplicates</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* New Group */}
                {parsedData.new.length > 0 && (
                  <div className="group-container">
                    <div className="group-header">
                      <div className="group-title-wrapper" onClick={() => toggleGroupExpanded('new')}>
                        {expandedGroups.new ? <IconChevronDown size={16} className="text-zinc-500" /> : <IconChevronRight size={16} className="text-zinc-500" />}
                        <span className="group-title">New</span>
                        <CountBadge variant="warning" className="ml-2" data-testid="env-import-new-count">{parsedData.new.length}</CountBadge>
                      </div>
                    </div>
                    {expandedGroups.new && (
                      <div className="group-list">
                        {filteredNew.map((env, idx) => {
                          const globalIdx = [...parsedData.new, ...parsedData.duplicates].indexOf(env);
                          const isSelected = selectedIndices.has(globalIdx);
                          return (
                            <div key={idx} className="env-item group" data-testid="env-import-item">
                              <label className="env-item-label">
                                <Checkbox
                                  className="env-item-checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleItemSelection(env)}
                                  dataTestId="env-import-item-checkbox"
                                />
                                <div className="env-item-content">
                                  <div className="env-name">{env.name}</div>
                                  {(env.filePath || env.fileName) && (
                                    <div className="env-filepath" title={env.filePath || env.fileName}>
                                      {env.filePath || env.fileName}
                                    </div>
                                  )}
                                </div>
                              </label>
                            </div>
                          );
                        })}
                        {filteredNew.length === 0 && searchText && (
                          <div className="empty-state">No matching new environments</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default ImportEnvironmentModal;

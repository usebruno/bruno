import React, { useEffect, useState, useRef, useCallback } from 'react';
import usePrevious from 'hooks/usePrevious';
import useOnClickOutside from 'hooks/useOnClickOutside';
import useDebounce from 'hooks/useDebounce';
import EnvironmentDetails from './EnvironmentDetails';
import { IconDownload, IconUpload, IconSearch, IconPlus, IconCheck, IconX, IconFileAlert } from '@tabler/icons';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import ConfirmSwitchEnv from 'components/WorkspaceHome/WorkspaceEnvironments/EnvironmentList/ConfirmSwitchEnv';
import ImportEnvironmentModal from 'components/Environments/Common/ImportEnvironmentModal';
import CollapsibleSection from 'components/Environments/CollapsibleSection';
import DotEnvFileEditor from 'components/Environments/DotEnvFileEditor';
import DotEnvFileDetails from 'components/Environments/DotEnvFileDetails';
import ColorBadge from 'components/ColorBadge';
import { isEqual } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import {
  addEnvironment,
  renameEnvironment,
  selectEnvironment,
  saveDotEnvVariables,
  saveDotEnvRaw,
  createDotEnvFile,
  deleteDotEnvFile
} from 'providers/ReduxStore/slices/collections/actions';
import { setEnvironmentsDraft, clearEnvironmentsDraft } from 'providers/ReduxStore/slices/collections';
import { setEnvVarSearchQuery, setEnvVarSearchExpanded } from 'providers/ReduxStore/slices/app';
import { validateName, validateNameError } from 'utils/common/regex';
import toast from 'react-hot-toast';
import classnames from 'classnames';

const EMPTY_ARRAY = [];

const EnvironmentList = ({
  environments,
  activeEnvironmentUid,
  selectedEnvironment,
  setSelectedEnvironment,
  isModified,
  setIsModified,
  collection,
  setShowExportModal
}) => {
  const dispatch = useDispatch();
  const envSearchQuery = useSelector((state) => state.app.envVarSearch?.collection?.query ?? '');
  const isEnvSearchExpanded = useSelector((state) => state.app.envVarSearch?.collection?.expanded ?? false);
  const setEnvSearchQuery = (q) => dispatch(setEnvVarSearchQuery({ context: 'collection', query: q }));
  const setIsEnvSearchExpanded = (v) => dispatch(setEnvVarSearchExpanded({ context: 'collection', expanded: v }));

  const [openImportModal, setOpenImportModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isEnvListSearchExpanded, setIsEnvListSearchExpanded] = useState(false);
  const envListSearchInputRef = useRef(null);
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [renamingEnvUid, setRenamingEnvUid] = useState(null);
  const [newEnvName, setNewEnvName] = useState('');
  const [envNameError, setEnvNameError] = useState('');
  const inputRef = useRef(null);
  const renameContainerRef = useRef(null);
  const createContainerRef = useRef(null);

  const [switchEnvConfirmClose, setSwitchEnvConfirmClose] = useState(false);
  const [originalEnvironmentVariables, setOriginalEnvironmentVariables] = useState([]);
  const [environmentsExpanded, setEnvironmentsExpanded] = useState(true);
  const [dotEnvExpanded, setDotEnvExpanded] = useState(false);
  const [activeView, setActiveView] = useState('environment');
  const [isDotEnvModified, setIsDotEnvModified] = useState(false);
  const [dotEnvViewMode, setDotEnvViewMode] = useState('table');
  const [selectedDotEnvFile, setSelectedDotEnvFile] = useState(null);
  const [isCreatingDotEnvInline, setIsCreatingDotEnvInline] = useState(false);
  const [newDotEnvName, setNewDotEnvName] = useState('.env');
  const [dotEnvNameError, setDotEnvNameError] = useState('');
  const dotEnvInputRef = useRef(null);
  const dotEnvCreateContainerRef = useRef(null);

  const debouncedEnvSearchQuery = useDebounce(envSearchQuery, 300);
  const envSearchInputRef = useRef(null);

  const dotEnvFiles = useSelector((state) => {
    const coll = state.collections.collections.find((c) => c.uid === collection?.uid);
    return coll?.dotEnvFiles || EMPTY_ARRAY;
  });

  const envUids = environments ? environments.map((env) => env.uid) : [];
  const prevEnvUids = usePrevious(envUids);

  const handleDotEnvModifiedChange = useCallback((modified) => {
    setIsDotEnvModified(modified);
    if (modified) {
      dispatch(setEnvironmentsDraft({
        collectionUid: collection.uid,
        environmentUid: `dotenv:${selectedDotEnvFile}`,
        variables: []
      }));
    } else {
      dispatch(clearEnvironmentsDraft({ collectionUid: collection.uid }));
    }
  }, [dispatch, collection.uid, selectedDotEnvFile]);

  useEffect(() => {
    if (dotEnvFiles.length === 0) {
      setSelectedDotEnvFile(null);
      setActiveView('environment');
      handleDotEnvModifiedChange(false);
      return;
    }

    const fileExists = dotEnvFiles.some((f) => f.filename === selectedDotEnvFile);
    if (!selectedDotEnvFile || !fileExists) {
      setSelectedDotEnvFile(dotEnvFiles[0].filename);
    }
  }, [dotEnvFiles]);

  useEffect(() => {
    if (!environments?.length) {
      setSelectedEnvironment(null);
      setOriginalEnvironmentVariables([]);
      return;
    }

    if (selectedEnvironment) {
      let _selectedEnvironment = environments?.find((env) => env?.uid === selectedEnvironment?.uid);

      if (!_selectedEnvironment) {
        _selectedEnvironment = environments?.find((env) => env?.name === selectedEnvironment?.name);
      }

      if (!_selectedEnvironment) {
        _selectedEnvironment = environments?.find((env) => env.uid === activeEnvironmentUid) || environments?.[0];
      }

      const hasSelectedEnvironmentChanged = !isEqual(selectedEnvironment, _selectedEnvironment);
      if (hasSelectedEnvironmentChanged || selectedEnvironment.uid !== _selectedEnvironment?.uid) {
        setSelectedEnvironment(_selectedEnvironment);
      }
      setOriginalEnvironmentVariables(_selectedEnvironment?.variables || []);
      return;
    }

    const environment = environments?.find((env) => env.uid === activeEnvironmentUid) || environments?.[0];

    setSelectedEnvironment(environment);
    setOriginalEnvironmentVariables(environment?.variables || []);
  }, [environments, activeEnvironmentUid, selectedEnvironment]);

  useEffect(() => {
    if (prevEnvUids && prevEnvUids.length && envUids.length > prevEnvUids.length) {
      const newEnv = environments.find((env) => !prevEnvUids.includes(env.uid));
      if (newEnv) {
        setSelectedEnvironment(newEnv);
      }
    }

    if (prevEnvUids && prevEnvUids.length && envUids.length < prevEnvUids.length) {
      setSelectedEnvironment(environments && environments.length ? environments[0] : null);
    }
  }, [envUids, environments, prevEnvUids]);

  const handleEnvironmentClick = (env) => {
    if (activeView === 'dotenv' && isDotEnvModified) {
      setSwitchEnvConfirmClose(true);
      return;
    }
    if (!isModified) {
      setSelectedEnvironment(env);
      setActiveView('environment');
      setEnvironmentsExpanded(true);
    } else {
      setSwitchEnvConfirmClose(true);
    }
  };

  const handleDotEnvClick = (filename) => {
    if (isModified) {
      setSwitchEnvConfirmClose(true);
      return;
    }
    if (activeView === 'dotenv' && isDotEnvModified && selectedDotEnvFile !== filename) {
      setSwitchEnvConfirmClose(true);
      return;
    }
    setSelectedDotEnvFile(filename);
    setActiveView('dotenv');
    setDotEnvExpanded(true);
  };

  const handleEnvironmentDoubleClick = (env) => {
    setRenamingEnvUid(env.uid);
    setNewEnvName(env.name);
    setEnvNameError('');
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleActivateEnvironment = useCallback((e, env) => {
    e.stopPropagation();
    dispatch(selectEnvironment(env.uid, collection.uid))
      .then(() => {
        toast.success(`Environment "${env.name}" activated`);
      })
      .catch(() => {
        toast.error('Failed to activate environment');
      });
  }, [dispatch, collection.uid]);

  const validateEnvironmentName = (name, excludeUid = null) => {
    if (!name || name.trim() === '') {
      return 'Name is required';
    }

    if (!validateName(name)) {
      return validateNameError(name);
    }

    const trimmedName = name.toLowerCase().trim();
    const isDuplicate = environments.some(
      (env) => env?.uid !== excludeUid && env?.name?.toLowerCase().trim() === trimmedName
    );
    if (isDuplicate) {
      return 'Environment already exists';
    }

    return null;
  };

  const handleCreateEnvClick = () => {
    if (!isModified && !isDotEnvModified) {
      setIsCreatingInline(true);
      setNewEnvName('');
      setEnvNameError('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSwitchEnvConfirmClose(true);
    }
  };

  const handleCancelCreate = useCallback(() => {
    setIsCreatingInline(false);
    setNewEnvName('');
    setEnvNameError('');
  }, []);

  useOnClickOutside(createContainerRef, handleCancelCreate, isCreatingInline);

  const handleSaveNewEnv = () => {
    const error = validateEnvironmentName(newEnvName);
    if (error) {
      setEnvNameError(error);
      return;
    }

    dispatch(addEnvironment(newEnvName, collection.uid))
      .then(() => {
        toast.success('Environment created!');
        setIsCreatingInline(false);
        setNewEnvName('');
        setEnvNameError('');
      })
      .catch(() => {
        toast.error('An error occurred while creating the environment');
      });
  };

  const handleEnvNameChange = (e) => {
    const value = e.target.value;
    setNewEnvName(value);

    if (envNameError) {
      setEnvNameError('');
    }
  };

  const handleEnvNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (renamingEnvUid) {
        handleSaveRename();
      } else {
        handleSaveNewEnv();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (renamingEnvUid) {
        handleCancelRename();
      } else {
        handleCancelCreate();
      }
    }
  };

  const handleSaveRename = () => {
    const error = validateEnvironmentName(newEnvName, renamingEnvUid);
    if (error) {
      setEnvNameError(error);
      return;
    }

    dispatch(renameEnvironment(newEnvName, renamingEnvUid, collection.uid))
      .then(() => {
        toast.success('Environment renamed!');
        setRenamingEnvUid(null);
        setNewEnvName('');
        setEnvNameError('');
      })
      .catch(() => {
        toast.error('An error occurred while renaming the environment');
      });
  };

  const handleCancelRename = useCallback(() => {
    setRenamingEnvUid(null);
    setNewEnvName('');
    setEnvNameError('');
  }, []);

  useOnClickOutside(renameContainerRef, handleCancelRename, !!renamingEnvUid);

  const handleImportClick = () => {
    if (!isModified && !isDotEnvModified) {
      setOpenImportModal(true);
    } else {
      setSwitchEnvConfirmClose(true);
    }
  };

  const handleExportClick = () => {
    if (setShowExportModal) {
      setShowExportModal(true);
    }
  };

  const handleConfirmSwitch = (saveChanges) => {
    if (!saveChanges) {
      setSwitchEnvConfirmClose(false);
    }
  };

  const handleSaveDotEnv = (variables) => {
    if (!selectedDotEnvFile) return Promise.reject(new Error('No file selected'));
    return dispatch(saveDotEnvVariables(collection.uid, variables, selectedDotEnvFile));
  };

  const handleSaveDotEnvRaw = (content) => {
    if (!selectedDotEnvFile) return Promise.reject(new Error('No file selected'));
    return dispatch(saveDotEnvRaw(collection.uid, content, selectedDotEnvFile));
  };

  const handleCreateDotEnvInlineClick = () => {
    if (isModified || isDotEnvModified) {
      setSwitchEnvConfirmClose(true);
      return;
    }
    setIsCreatingDotEnvInline(true);
    setNewDotEnvName('.env');
    setDotEnvNameError('');
    setTimeout(() => {
      dotEnvInputRef.current?.focus();
      const input = dotEnvInputRef.current;
      if (input) {
        input.setSelectionRange(input.value.length, input.value.length);
      }
    }, 50);
  };

  const handleCancelDotEnvCreate = useCallback(() => {
    setIsCreatingDotEnvInline(false);
    setNewDotEnvName('.env');
    setDotEnvNameError('');
  }, []);

  useOnClickOutside(dotEnvCreateContainerRef, handleCancelDotEnvCreate, isCreatingDotEnvInline);

  const validateDotEnvName = (name) => {
    if (!name || name.trim() === '') {
      return 'Name is required';
    }

    if (!name.startsWith('.env')) {
      return 'File name must start with .env';
    }

    const validPattern = /^\.env[a-zA-Z0-9._-]*$/;
    if (!validPattern.test(name)) {
      return 'Invalid file name';
    }

    const exists = dotEnvFiles.some((f) => f.filename === name);
    if (exists) {
      return 'File already exists';
    }

    return null;
  };

  const handleSaveNewDotEnv = () => {
    const error = validateDotEnvName(newDotEnvName);
    if (error) {
      setDotEnvNameError(error);
      return;
    }

    dispatch(createDotEnvFile(collection.uid, newDotEnvName))
      .then(() => {
        toast.success(`${newDotEnvName} file created!`);
        setIsCreatingDotEnvInline(false);
        setNewDotEnvName('.env');
        setDotEnvNameError('');
        setSelectedDotEnvFile(newDotEnvName);
        setActiveView('dotenv');
        setDotEnvExpanded(true);
      })
      .catch((error) => {
        toast.error(error.message || 'Failed to create .env file');
      });
  };

  const handleDotEnvNameChange = (e) => {
    const value = e.target.value;
    if (!value.startsWith('.env')) {
      setNewDotEnvName('.env');
    } else {
      setNewDotEnvName(value);
    }
    if (dotEnvNameError) {
      setDotEnvNameError('');
    }
  };

  const handleDotEnvNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveNewDotEnv();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelDotEnvCreate();
    } else if (e.key === 'Backspace') {
      const input = e.target;
      if (input.selectionStart <= 4 && input.selectionEnd <= 4) {
        e.preventDefault();
      }
    }
  };

  const handleDeleteDotEnvFile = (filename) => {
    dispatch(deleteDotEnvFile(collection.uid, filename))
      .then(() => {
        toast.success(`${filename} file deleted!`);
        handleDotEnvModifiedChange(false);
        if (selectedDotEnvFile === filename) {
          const remainingFiles = dotEnvFiles.filter((f) => f.filename !== filename);
          if (remainingFiles.length > 0) {
            setSelectedDotEnvFile(remainingFiles[0].filename);
          } else {
            setActiveView('environment');
            if (environments?.length) {
              const env = environments.find((e) => e.uid === activeEnvironmentUid) || environments[0];
              setSelectedEnvironment(env);
            }
          }
        }
      })
      .catch((error) => {
        toast.error(error.message || 'Failed to delete .env file');
      });
  };

  const handleDotEnvViewModeChange = (mode) => {
    setDotEnvViewMode(mode);
  };

  const filteredEnvironments
    = environments?.filter((env) => env.name.toLowerCase().includes(searchText.toLowerCase())) || [];

  const selectedDotEnvData = dotEnvFiles.find((f) => f.filename === selectedDotEnvFile);

  const renderContent = () => {
    if (activeView === 'dotenv' && selectedDotEnvFile && selectedDotEnvData) {
      return (
        <DotEnvFileDetails
          title={selectedDotEnvFile}
          onDelete={() => handleDeleteDotEnvFile(selectedDotEnvFile)}
          dotEnvExists={selectedDotEnvData?.exists}
          viewMode={dotEnvViewMode}
          onViewModeChange={handleDotEnvViewModeChange}
        >
          <DotEnvFileEditor
            variables={selectedDotEnvData?.variables || []}
            onSave={handleSaveDotEnv}
            onSaveRaw={handleSaveDotEnvRaw}
            isModified={isDotEnvModified}
            setIsModified={handleDotEnvModifiedChange}
            dotEnvExists={selectedDotEnvData?.exists}
            viewMode={dotEnvViewMode}
            collection={collection}
          />
        </DotEnvFileDetails>
      );
    }

    if (selectedEnvironment) {
      return (
        <EnvironmentDetails
          environment={selectedEnvironment}
          setIsModified={setIsModified}
          originalEnvironmentVariables={originalEnvironmentVariables}
          collection={collection}
          searchQuery={envSearchQuery}
          setSearchQuery={setEnvSearchQuery}
          isSearchExpanded={isEnvSearchExpanded}
          setIsSearchExpanded={setIsEnvSearchExpanded}
          debouncedSearchQuery={debouncedEnvSearchQuery}
          searchInputRef={envSearchInputRef}
        />
      );
    }

    return (
      <div className="empty-state">
        <IconFileAlert size={48} strokeWidth={1.5} />
        <div className="title">No Environments</div>
        <div className="actions">
          <Button size="sm" color="secondary" onClick={() => handleCreateEnvClick()}>
            Create Environment
          </Button>
          <Button size="sm" color="secondary" onClick={() => handleImportClick()}>
            Import Environment
          </Button>
        </div>
      </div>
    );
  };

  return (
    <StyledWrapper>
      {openImportModal && (
        <ImportEnvironmentModal type="collection" collection={collection} onClose={() => setOpenImportModal(false)} />
      )}

      <div className="environments-container">
        {switchEnvConfirmClose && (
          <div className="confirm-switch-overlay">
            <ConfirmSwitchEnv onCancel={() => handleConfirmSwitch(false)} />
          </div>
        )}

        <div className="sidebar">

          <div className="sections-container">
            <CollapsibleSection
              title="Environments"
              expanded={environmentsExpanded}
              onToggle={() => setEnvironmentsExpanded(!environmentsExpanded)}
              actions={(
                <>
                  <button
                    type="button"
                    className={`btn-action ${isEnvListSearchExpanded ? 'active' : ''}`}
                    onClick={() => {
                      const next = !isEnvListSearchExpanded;
                      setIsEnvListSearchExpanded(next);
                      if (!next) setSearchText('');
                      else setTimeout(() => envListSearchInputRef.current?.focus(), 50);
                    }}
                    title="Search environments"
                  >
                    <IconSearch size={14} strokeWidth={1.5} />
                  </button>
                  <button type="button" className="btn-action" onClick={() => handleCreateEnvClick()} title="Create environment">
                    <IconPlus size={14} strokeWidth={1.5} />
                  </button>
                  <button type="button" className="btn-action" onClick={() => handleImportClick()} title="Import environment">
                    <IconDownload size={14} strokeWidth={1.5} />
                  </button>
                  <button type="button" className="btn-action" onClick={() => handleExportClick()} title="Export environment">
                    <IconUpload size={14} strokeWidth={1.5} />
                  </button>
                </>
              )}
            >
              {isEnvListSearchExpanded && (
                <div className="env-list-search">
                  <IconSearch size={13} strokeWidth={1.5} className="env-list-search-icon" />
                  <input
                    ref={envListSearchInputRef}
                    type="text"
                    placeholder="Search environments..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="env-list-search-input"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  {searchText && (
                    <button className="env-list-search-clear" title="Clear search" onClick={() => setSearchText('')} onMouseDown={(e) => e.preventDefault()}>
                      <IconX size={12} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              )}
              <div className="environments-list">
                {filteredEnvironments.map((env) => (
                  <div
                    key={env.uid}
                    id={env.uid}
                    className={classnames('environment-item', {
                      active: activeView === 'environment' && selectedEnvironment?.uid === env.uid,
                      renaming: renamingEnvUid === env.uid,
                      activated: activeEnvironmentUid === env.uid
                    })}
                    onClick={() => renamingEnvUid !== env.uid && handleEnvironmentClick(env)}
                    onDoubleClick={() => handleEnvironmentDoubleClick(env)}
                  >
                    {renamingEnvUid === env.uid ? (
                      <div className="rename-container" ref={renameContainerRef}>
                        <input
                          ref={inputRef}
                          type="text"
                          className="environment-name-input"
                          value={newEnvName}
                          onChange={handleEnvNameChange}
                          onKeyDown={handleEnvNameKeyDown}
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                        />
                        <div className="inline-actions">
                          <button
                            className="inline-action-btn save"
                            onClick={handleSaveRename}
                            onMouseDown={(e) => e.preventDefault()}
                            title="Save"
                          >
                            <IconCheck size={14} strokeWidth={2} />
                          </button>
                          <button
                            className="inline-action-btn cancel"
                            onClick={handleCancelRename}
                            onMouseDown={(e) => e.preventDefault()}
                            title="Cancel"
                          >
                            <IconX size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <ColorBadge color={env.color} size={8} />
                        <span className="environment-name">{env.name}</span>
                        <div className="environment-actions">
                          {activeEnvironmentUid === env.uid ? (
                            <div className="activated-checkmark" title="Active environment">
                              <IconCheck size={16} strokeWidth={2} />
                            </div>
                          ) : (
                            <button
                              className="activate-btn"
                              onClick={(e) => handleActivateEnvironment(e, env)}
                              title="Activate environment"
                            >
                              <IconCheck size={16} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {isCreatingInline && (
                  <div className="environment-item creating" ref={createContainerRef}>
                    <input
                      ref={inputRef}
                      type="text"
                      className="environment-name-input"
                      value={newEnvName}
                      onChange={handleEnvNameChange}
                      onKeyDown={handleEnvNameKeyDown}
                      placeholder="Environment name..."
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                    <div className="inline-actions">
                      <button
                        className="inline-action-btn save"
                        onClick={handleSaveNewEnv}
                        onMouseDown={(e) => e.preventDefault()}
                        title="Save"
                      >
                        <IconCheck size={14} strokeWidth={2} />
                      </button>
                      <button
                        className="inline-action-btn cancel"
                        onClick={handleCancelCreate}
                        onMouseDown={(e) => e.preventDefault()}
                        title="Cancel"
                      >
                        <IconX size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )}

                {envNameError && (isCreatingInline || renamingEnvUid) && <div className="env-error">{envNameError}</div>}

                {filteredEnvironments.length === 0 && !isCreatingInline && (
                  <div className="no-env-file">
                    <span>No environments</span>
                  </div>
                )}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              title=".env Files"
              expanded={dotEnvExpanded}
              onToggle={() => setDotEnvExpanded(!dotEnvExpanded)}
              badge={dotEnvFiles.length}
              actions={(
                <button
                  className="btn-action"
                  onClick={handleCreateDotEnvInlineClick}
                  title="Create .env file"
                >
                  <IconPlus size={14} strokeWidth={1.5} />
                </button>
              )}
            >
              <div className="environments-list">
                {dotEnvFiles.map((file) => (
                  <div
                    key={file.filename}
                    className={classnames('environment-item', {
                      active: activeView === 'dotenv' && selectedDotEnvFile === file.filename
                    })}
                    onClick={() => handleDotEnvClick(file.filename)}
                  >
                    <span className="environment-name">{file.filename}</span>
                  </div>
                ))}

                {isCreatingDotEnvInline && (
                  <div className="environment-item creating" ref={dotEnvCreateContainerRef}>
                    <input
                      ref={dotEnvInputRef}
                      type="text"
                      className="environment-name-input"
                      value={newDotEnvName}
                      onChange={handleDotEnvNameChange}
                      onKeyDown={handleDotEnvNameKeyDown}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                    />
                    <div className="inline-actions">
                      <button
                        className="inline-action-btn save"
                        onClick={handleSaveNewDotEnv}
                        onMouseDown={(e) => e.preventDefault()}
                        title="Create"
                      >
                        <IconCheck size={14} strokeWidth={2} />
                      </button>
                      <button
                        className="inline-action-btn cancel"
                        onClick={handleCancelDotEnvCreate}
                        onMouseDown={(e) => e.preventDefault()}
                        title="Cancel"
                      >
                        <IconX size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                )}

                {dotEnvNameError && isCreatingDotEnvInline && <div className="env-error">{dotEnvNameError}</div>}

                {dotEnvFiles.length === 0 && !isCreatingDotEnvInline && (
                  <div className="no-env-file">
                    <span>No .env files</span>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          </div>
        </div>

        {renderContent()}
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentList;

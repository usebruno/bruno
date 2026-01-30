import React, { useEffect, useState, useRef } from 'react';
import usePrevious from 'hooks/usePrevious';
import EnvironmentDetails from './EnvironmentDetails';
import CreateEnvironment from '../CreateEnvironment';
import { IconDownload, IconUpload, IconSearch, IconPlus, IconCheck, IconX } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import ConfirmSwitchEnv from './ConfirmSwitchEnv';
import ImportEnvironmentModal from 'components/Environments/Common/ImportEnvironmentModal';
import ColorBadge from 'components/ColorBadge';
import { isEqual } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { addGlobalEnvironment, renameGlobalEnvironment, selectGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { validateName, validateNameError } from 'utils/common/regex';
import toast from 'react-hot-toast';

const EnvironmentList = ({ environments, activeEnvironmentUid, selectedEnvironment, setSelectedEnvironment, isModified, setIsModified, collection, setShowExportModal }) => {
  const dispatch = useDispatch();
  const globalEnvs = useSelector((state) => state?.globalEnvironments?.globalEnvironments);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [renamingEnvUid, setRenamingEnvUid] = useState(null);
  const [newEnvName, setNewEnvName] = useState('');
  const [envNameError, setEnvNameError] = useState('');
  const inputRef = useRef(null);
  const renameContainerRef = useRef(null);
  const createContainerRef = useRef(null);

  const [switchEnvConfirmClose, setSwitchEnvConfirmClose] = useState(false);
  const [originalEnvironmentVariables, setOriginalEnvironmentVariables] = useState([]);

  const envUids = environments ? environments.map((env) => env.uid) : [];
  const prevEnvUids = usePrevious(envUids);

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

  useEffect(() => {
    if (!renamingEnvUid) return;

    const handleClickOutside = (event) => {
      if (renameContainerRef.current && !renameContainerRef.current.contains(event.target)) {
        handleCancelRename();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [renamingEnvUid]);

  useEffect(() => {
    if (!isCreatingInline) return;

    const handleClickOutside = (event) => {
      if (createContainerRef.current && !createContainerRef.current.contains(event.target)) {
        handleCancelCreate();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCreatingInline]);

  const handleEnvironmentClick = (env) => {
    if (!isModified) {
      setSelectedEnvironment(env);
    } else {
      setSwitchEnvConfirmClose(true);
    }
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

  const handleActivateEnvironment = (e, env) => {
    e.stopPropagation();
    dispatch(selectGlobalEnvironment({ environmentUid: env.uid }))
      .then(() => {
        toast.success(`Environment "${env.name}" activated`);
      })
      .catch(() => {
        toast.error('Failed to activate environment');
      });
  };

  if (!selectedEnvironment) {
    return null;
  }

  const validateEnvironmentName = (name, excludeUid = null) => {
    if (!name || name.trim() === '') {
      return 'Name is required';
    }

    if (!validateName(name)) {
      return validateNameError(name);
    }

    const trimmedName = name.toLowerCase().trim();
    const isDuplicate = globalEnvs.some((env) =>
      env?.uid !== excludeUid && env?.name?.toLowerCase().trim() === trimmedName);
    if (isDuplicate) {
      return 'Environment already exists';
    }

    return null;
  };

  const handleCreateEnvClick = () => {
    if (!isModified) {
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

  const handleCancelCreate = () => {
    setIsCreatingInline(false);
    setNewEnvName('');
    setEnvNameError('');
  };

  const handleSaveNewEnv = () => {
    const error = validateEnvironmentName(newEnvName);
    if (error) {
      setEnvNameError(error);
      return;
    }

    dispatch(addGlobalEnvironment({ name: newEnvName }))
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

    dispatch(renameGlobalEnvironment({ name: newEnvName, environmentUid: renamingEnvUid }))
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

  const handleCancelRename = () => {
    setRenamingEnvUid(null);
    setNewEnvName('');
    setEnvNameError('');
  };

  const handleImportClick = () => {
    if (!isModified) {
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

  const filteredEnvironments = environments?.filter((env) =>
    env.name.toLowerCase().includes(searchText.toLowerCase())) || [];

  return (
    <StyledWrapper>
      {openCreateModal && <CreateEnvironment onClose={() => setOpenCreateModal(false)} />}
      {openImportModal && <ImportEnvironmentModal type="global" onClose={() => setOpenImportModal(false)} />}

      <div className="environments-container">
        {switchEnvConfirmClose && (
          <div className="confirm-switch-overlay">
            <ConfirmSwitchEnv onCancel={() => handleConfirmSwitch(false)} />
          </div>
        )}

        {/* Left Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <h2 className="title">Environments</h2>
            <div className="flex items-center gap-2">
              <button className="btn-action" onClick={() => handleCreateEnvClick()} title="Create environment">
                <IconPlus size={16} strokeWidth={1.5} />
              </button>
              <button className="btn-action" onClick={() => handleImportClick()} title="Import environment">
                <IconDownload size={16} strokeWidth={1.5} />
              </button>
              <button className="btn-action" onClick={() => handleExportClick()} title="Export environment">
                <IconUpload size={16} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          <div className="search-container">
            <IconSearch size={14} strokeWidth={1.5} className="search-icon" />
            <input
              type="text"
              placeholder="Search environments..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="environments-list">
            {filteredEnvironments.map((env) => (
              <div
                key={env.uid}
                id={env.uid}
                className={`environment-item ${selectedEnvironment.uid === env.uid ? 'active' : ''} ${renamingEnvUid === env.uid ? 'renaming' : ''} ${activeEnvironmentUid === env.uid ? 'activated' : ''}`}
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

            {envNameError && (isCreatingInline || renamingEnvUid) && (
              <div className="env-error">{envNameError}</div>
            )}
          </div>
        </div>

        {/* Right Content */}
        <EnvironmentDetails
          environment={selectedEnvironment}
          setIsModified={setIsModified}
          originalEnvironmentVariables={originalEnvironmentVariables}
          collection={collection}
        />
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentList;

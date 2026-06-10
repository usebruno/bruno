import { IconCopy, IconEdit, IconTrash, IconCheck, IconX, IconSearch, IconDeviceFloppy } from '@tabler/icons';
import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { renameGlobalEnvironment, updateGlobalEnvironmentColor } from 'providers/ReduxStore/slices/global-environments';
import { updateTabState } from 'providers/ReduxStore/slices/tabs';
import { validateName, validateNameError } from 'utils/common/regex';
import toast from 'react-hot-toast';
import CopyEnvironment from '../../CopyEnvironment';
import DeleteEnvironment from '../../DeleteEnvironment';
import EnvironmentVariables from './EnvironmentVariables';
import ColorPicker from 'components/ColorPicker';
import ActionIcon from 'ui/ActionIcon';
import ResponsiveTabs from 'ui/ResponsiveTabs';
import StyledWrapper from './StyledWrapper';

const TABS = [
  { key: 'variables', label: 'Variables' },
  { key: 'secrets', label: 'Secrets' }
];

const EnvironmentDetails = ({ environment, setIsModified, collection, searchQuery, setSearchQuery, isSearchExpanded, setIsSearchExpanded, debouncedSearchQuery, searchInputRef }) => {
  const dispatch = useDispatch();
  const globalEnvs = useSelector((state) => state?.globalEnvironments?.globalEnvironments);

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openCopyModal, setOpenCopyModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const activeTab = useSelector((state) => state.tabs.tabs.find((t) => t.uid === activeTabUid)?.tabState?.envTab) || 'variables';
  const setActiveTab = (tab) => dispatch(updateTabState({ uid: activeTabUid, tabState: { envTab: tab } }));
  const inputRef = useRef(null);
  const rightContentRef = useRef(null);

  const validateEnvironmentName = (name) => {
    if (!name || name.trim() === '') {
      return 'Name is required';
    }

    if (name.length < 1) {
      return 'Must be at least 1 character';
    }

    if (name.length > 255) {
      return 'Must be 255 characters or less';
    }

    if (!validateName(name)) {
      return validateNameError(name);
    }

    const trimmedName = name.toLowerCase().trim();
    const isDuplicate = (globalEnvs || []).some((env) =>
      env?.uid !== environment.uid && env?.name?.toLowerCase().trim() === trimmedName);
    if (isDuplicate) {
      return 'Environment already exists';
    }

    return null;
  };

  const handleRenameClick = () => {
    setIsRenaming(true);
    setNewName(environment.name);
    setNameError('');
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleSaveRename = () => {
    const error = validateEnvironmentName(newName);
    if (error) {
      setNameError(error);
      return;
    }

    dispatch(renameGlobalEnvironment({ name: newName, environmentUid: environment.uid }))
      .then(() => {
        toast.success('Environment renamed!');
        setIsRenaming(false);
        setNewName('');
        setNameError('');
      })
      .catch(() => {
        toast.error('An error occurred while renaming the environment');
      });
  };

  const handleCancelRename = () => {
    setIsRenaming(false);
    setNewName('');
    setNameError('');
  };

  const handleNameChange = (e) => {
    setNewName(e.target.value);
    if (nameError) {
      setNameError('');
    }
  };

  const handleNameBlur = () => {
    if (newName.trim() === '') {
      handleCancelRename();
    } else {
      const error = validateEnvironmentName(newName);
      if (error) {
        setNameError(error);
      }
    }
  };

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  const handleSearchIconClick = () => {
    setIsSearchExpanded(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleSearchBlur = () => {
    if (searchQuery === '') {
      setIsSearchExpanded(false);
    }
  };

  const handleColorChange = (color) => {
    dispatch(updateGlobalEnvironmentColor(environment.uid, color));
  };

  const handleSaveAll = () => {
    window.dispatchEvent(new Event('environment-save-all'));
  };

  return (
    <StyledWrapper>
      {openDeleteModal && (
        <DeleteEnvironment
          onClose={() => setOpenDeleteModal(false)}
          environment={environment}
        />
      )}
      {openCopyModal && (
        <CopyEnvironment onClose={() => setOpenCopyModal(false)} environment={environment} />
      )}

      <div className="header">
        <div className={`title-container ${isRenaming ? 'renaming' : ''}`}>
          {isRenaming ? (
            <>
              <input
                ref={inputRef}
                type="text"
                className="title-input"
                value={newName}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                onKeyDown={handleNameKeyDown}
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
            </>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="title">{environment.name}</h2>
              <ColorPicker color={environment.color} onChange={handleColorChange} />
            </div>
          )}
        </div>
        {nameError && isRenaming && <div className="title-error">{nameError}</div>}
        <div className="actions">
          <ActionIcon label="Rename" onClick={handleRenameClick} data-testid="env-rename-action">
            <IconEdit size={15} strokeWidth={1.5} />
          </ActionIcon>
          <ActionIcon label="Copy" onClick={() => setOpenCopyModal(true)} data-testid="env-copy-action">
            <IconCopy size={15} strokeWidth={1.5} />
          </ActionIcon>
          <ActionIcon label="Delete" onClick={() => setOpenDeleteModal(true)} colorOnHover="danger" data-testid="env-delete-action">
            <IconTrash size={15} strokeWidth={1.5} />
          </ActionIcon>
        </div>
      </div>

      <div className="tabs-container">
        <ResponsiveTabs
          tabs={TABS}
          activeTab={activeTab}
          onTabSelect={setActiveTab}
          rightContent={(
            <div ref={rightContentRef} className="env-search-container">
              <ActionIcon label="Save" onClick={handleSaveAll} data-testid="save-all-env">
                <IconDeviceFloppy size={15} strokeWidth={1.5} />
              </ActionIcon>
              {isSearchExpanded ? (
                <div className="search-input-wrapper">
                  <IconSearch size={14} strokeWidth={1.5} className="search-icon" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={activeTab === 'secrets' ? 'Search secrets...' : 'Search variables...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={handleSearchBlur}
                    className="search-input"
                    data-testid="env-search-input"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                  />
                  {searchQuery && (
                    <button
                      className="clear-search"
                      onClick={handleClearSearch}
                      onMouseDown={(e) => e.preventDefault()}
                      title="Clear search"
                      data-testid="env-clear-search"
                    >
                      <IconX size={14} strokeWidth={1.5} />
                    </button>
                  )}
                </div>
              ) : (
                <ActionIcon label="Search" onClick={handleSearchIconClick} data-testid="env-search-action">
                  <IconSearch size={15} strokeWidth={1.5} />
                </ActionIcon>
              )}
            </div>
          )}
          rightContentRef={rightContentRef}
        />
      </div>

      <div className="content">
        <EnvironmentVariables
          environment={environment}
          setIsModified={setIsModified}
          collection={collection}
          searchQuery={debouncedSearchQuery}
          variableType={activeTab}
        />
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentDetails;

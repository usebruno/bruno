import { IconCopy, IconEdit, IconTrash, IconCheck, IconX, IconSearch } from '@tabler/icons';
import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { renameEnvironment, updateEnvironmentColor } from 'providers/ReduxStore/slices/collections/actions';
import { validateName, validateNameError } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import CopyEnvironment from 'components/Environments/EnvironmentSettings/CopyEnvironment';
import DeleteEnvironment from 'components/Environments/EnvironmentSettings/DeleteEnvironment';
import EnvironmentVariables from './EnvironmentVariables';
import ColorPicker from 'components/ColorPicker';
import StyledWrapper from './StyledWrapper';

const EnvironmentDetails = ({ environment, setIsModified, collection, searchQuery, setSearchQuery, isSearchExpanded, setIsSearchExpanded, debouncedSearchQuery, searchInputRef }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const environments = collection?.environments || [];

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openCopyModal, setOpenCopyModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const inputRef = useRef(null);

  const validateEnvironmentName = (name) => {
    if (!name || name.trim() === '') {
      return t('ENV_SETTINGS.NAME_REQUIRED');
    }

    if (name.length < 1) {
      return t('ENV_SETTINGS.NAME_MIN_LENGTH');
    }

    if (name.length > 255) {
      return t('ENV_SETTINGS.NAME_MAX_LENGTH');
    }

    if (!validateName(name)) {
      return validateNameError(name);
    }

    const trimmedName = name.toLowerCase().trim();
    const isDuplicate = (environments || []).some(
      (env) => env?.uid !== environment.uid && env?.name?.toLowerCase().trim() === trimmedName
    );
    if (isDuplicate) {
      return t('ENV_SETTINGS.ENVIRONMENT_EXISTS');
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

    dispatch(renameEnvironment(newName, environment.uid, collection.uid))
      .then(() => {
        toast.success(t('ENV_SETTINGS.ENVIRONMENT_RENAMED'));
        setIsRenaming(false);
        setNewName('');
        setNameError('');
      })
      .catch(() => {
        toast.error(t('ENV_SETTINGS.ENVIRONMENT_RENAME_ERROR'));
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
    dispatch(updateEnvironmentColor(environment.uid, color, collection.uid));
  };

  return (
    <StyledWrapper>
      {openDeleteModal && (
        <DeleteEnvironment onClose={() => setOpenDeleteModal(false)} environment={environment} collection={collection} />
      )}
      {openCopyModal && (
        <CopyEnvironment onClose={() => setOpenCopyModal(false)} environment={environment} collection={collection} />
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
                  title={t('ENV_SETTINGS.SAVE')}
                >
                  <IconCheck size={14} strokeWidth={2} />
                </button>
                <button
                  className="inline-action-btn cancel"
                  onClick={handleCancelRename}
                  onMouseDown={(e) => e.preventDefault()}
                  title={t('ENV_SETTINGS.CANCEL')}
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
          {isSearchExpanded ? (
            <div className="search-input-wrapper">
              <IconSearch size={14} strokeWidth={1.5} className="search-icon" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('ENV_SETTINGS.SEARCH_VARIABLES')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={handleSearchBlur}
                className="search-input"
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
                  title={t('ENV_SETTINGS.CLEAR_SEARCH')}
                >
                  <IconX size={14} strokeWidth={1.5} />
                </button>
              )}
            </div>
          ) : (
            <button onClick={handleSearchIconClick} title={t('ENV_SETTINGS.SEARCH_VARIABLES')}>
              <IconSearch size={15} strokeWidth={1.5} />
            </button>
          )}
          <button onClick={handleRenameClick} title={t('ENV_SETTINGS.RENAME')}>
            <IconEdit size={15} strokeWidth={1.5} />
          </button>
          <button onClick={() => setOpenCopyModal(true)} title={t('ENV_SETTINGS.COPY')}>
            <IconCopy size={15} strokeWidth={1.5} />
          </button>
          <button onClick={() => setOpenDeleteModal(true)} title={t('ENV_SETTINGS.DELETE')}>
            <IconTrash size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="content">
        <EnvironmentVariables
          environment={environment}
          setIsModified={setIsModified}
          collection={collection}
          searchQuery={debouncedSearchQuery}
        />
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentDetails;

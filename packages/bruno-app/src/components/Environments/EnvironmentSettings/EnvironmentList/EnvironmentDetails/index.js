import { IconCopy, IconEdit, IconTrash, IconCheck, IconX } from '@tabler/icons';
import { useState, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { renameEnvironment } from 'providers/ReduxStore/slices/collections/actions';
import { validateName, validateNameError } from 'utils/common/regex';
import toast from 'react-hot-toast';
import CopyEnvironment from 'components/Environments/EnvironmentSettings/CopyEnvironment';
import DeleteEnvironment from 'components/Environments/EnvironmentSettings/DeleteEnvironment';
import EnvironmentVariables from './EnvironmentVariables';
import EnvironmentColor from '../EnvironmentDetails/EnvironmentColor';
import ToolHint from 'components/ToolHint/index';
import StyledWrapper from './StyledWrapper';

const EnvironmentDetails = ({ environment, setIsModified, collection }) => {
  const dispatch = useDispatch();
  const environments = collection?.environments || [];

  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [openCopyModal, setOpenCopyModal] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [nameError, setNameError] = useState('');
  const inputRef = useRef(null);

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
    const isDuplicate = (environments || []).some(
      (env) => env?.uid !== environment.uid && env?.name?.toLowerCase().trim() === trimmedName
    );
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

    dispatch(renameEnvironment(newName, environment.uid, collection.uid))
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
            <h2 className="title">{environment.name}</h2>
          )}
        </div>
        {nameError && isRenaming && <div className="title-error">{nameError}</div>}
        <div className="actions">
          <button onClick={handleRenameClick} title="Rename">
            <IconEdit size={15} strokeWidth={1.5} />
          </button>
          <button onClick={() => setOpenCopyModal(true)} title="Copy">
            <IconCopy size={15} strokeWidth={1.5} />
          </button>
          <button onClick={() => setOpenDeleteModal(true)} title="Delete">
            <IconTrash size={15} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <EnvironmentColor environment={environment} collectionUid={collection.uid} />
      <EnvironmentVariables environment={environment} collection={collection} setIsModified={setIsModified} onClose={onClose} />
    </StyledWrapper>
  );
};

export default EnvironmentDetails;

import { IconCopy, IconEdit, IconTrash, IconCheck, IconX } from '@tabler/icons';
import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { renameGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { validateName, validateNameError } from 'utils/common/regex';
import toast from 'react-hot-toast';
import styled from 'styled-components';
import CopyEnvironment from '../../CopyEnvironment';
import DeleteEnvironment from '../../DeleteEnvironment';
import EnvironmentVariables from './EnvironmentVariables';

const StyledWrapper = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${(props) => props.theme.bg};

  .header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px 12px 20px;
    flex-shrink: 0;
    
    .title {
      font-size: 15px;
      font-weight: 600;
      color: ${(props) => props.theme.text};
      margin: 0;
    }
    
    .title-container {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
      
      &.renaming {
        .title-input {
          flex: 1;
          background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
          outline: none;
          color: ${(props) => props.theme.text};
          font-size: 15px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 5px;
        }
        
        .inline-actions {
          display: flex;
          gap: 2px;
        }
        
        .inline-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
          
          &.save {
            color: ${(props) => props.theme.textLink};
            
            &:hover {
              background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
            }
          }
          
          &.cancel {
            color: ${(props) => props.theme.colors.text.muted};
            
            &:hover {
              background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
              color: ${(props) => props.theme.text};
            }
          }
        }
      }
    }
    
    .title-error {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      padding: 4px 8px;
      font-size: 11px;
      color: ${(props) => props.theme.colors.text.danger};
      background: ${(props) => `${props.theme.colors.text.danger}15`};
      border-radius: 4px;
      white-space: nowrap;
    }
    
    .actions {
      display: flex;
      gap: 2px;
      
      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        color: ${(props) => props.theme.colors.text.muted};
        background: transparent;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.15s ease;
        
        &:hover {
          background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
          color: ${(props) => props.theme.text};
        }
        
        &:last-child:hover {
          color: ${(props) => props.theme.colors.text.danger};
        }
      }
    }
  }
  
  .content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 0 20px 20px 20px;
  }
`;

const EnvironmentDetails = ({ environment, setIsModified, collection }) => {
  const dispatch = useDispatch();
  const globalEnvs = useSelector((state) => state?.globalEnvironments?.globalEnvironments);

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

      <div className="content">
        <EnvironmentVariables environment={environment} setIsModified={setIsModified} collection={collection} />
      </div>
    </StyledWrapper>
  );
};

export default EnvironmentDetails;

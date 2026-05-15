import { useRef, useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconCheck, IconX, IconSettings } from '@tabler/icons';
import get from 'lodash/get';
import path from 'utils/common/path';
import toast from 'react-hot-toast';
import { createCollection } from 'providers/ReduxStore/slices/collections/actions';
import { sanitizeName, validateName, validateNameError } from 'utils/common/regex';
import { DEFAULT_COLLECTION_FORMAT } from 'utils/common/constants';
import { multiLineMsg } from 'utils/common';
import { formatIpcError } from 'utils/common/error';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const InlineCollectionCreator = ({ onComplete, onCancel, onOpenAdvanced }) => {
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const dispatch = useDispatch();
  const [isCreating, setIsCreating] = useState(false);
  const openingAdvancedRef = useRef(false);
  const clickedOutsideRef = useRef(false);
  const { t } = useTranslation();

  const preferences = useSelector((state) => state.app.preferences);
  const workspaces = useSelector((state) => state.workspaces?.workspaces || []);
  const activeWorkspaceUid = useSelector((state) => state.workspaces?.activeWorkspaceUid);
  const activeWorkspace = workspaces.find((w) => w.uid === activeWorkspaceUid);
  const isDefaultWorkspace = activeWorkspace?.type === 'default';

  const defaultLocation = isDefaultWorkspace
    ? get(preferences, 'general.defaultLocation', '')
    : (activeWorkspace?.pathname ? path.join(activeWorkspace.pathname, 'collections') : '');

  useEffect(() => {
    const focusAndSelect = (value) => {
      if (!inputRef.current) {
        return;
      }
      if (value) {
        inputRef.current.value = value;
      }
      inputRef.current.focus();
      inputRef.current.select();
    };

    if (defaultLocation) {
      window.ipcRenderer?.invoke('renderer:find-unique-folder-name', t('SIDEBAR.INLINE_COLLECTION_UNTITLED'), defaultLocation)
        ?.then((name) => focusAndSelect(name))
        ?.catch(() => focusAndSelect());
    } else {
      focusAndSelect();
    }
  }, [defaultLocation, t]);

  const handleCancel = () => {
    if (isCreating || openingAdvancedRef.current) return;
    onCancel();
  };

  const handleCreate = useCallback(async () => {
    const fromOutside = clickedOutsideRef.current;
    clickedOutsideRef.current = false;

    if (isCreating || openingAdvancedRef.current) return;

    const name = inputRef.current?.value?.trim();
    if (!name) {
      if (fromOutside) {
        onCancel();
      } else {
        toast.error(t('SIDEBAR.INLINE_COLLECTION_NAME_REQUIRED'));
      }
      return;
    }

    if (!validateName(name)) {
      toast.error(validateNameError(name));
      if (fromOutside) {
        onCancel();
      }
      return;
    }

    if (!defaultLocation) {
      toast.error(t('SIDEBAR.INLINE_COLLECTION_SET_LOCATION'));
      onCancel();
      return;
    }

    setIsCreating(true);
    try {
      const folderName = sanitizeName(name);
      await dispatch(createCollection(name, folderName, defaultLocation, { format: DEFAULT_COLLECTION_FORMAT }));
      toast.success(t('SIDEBAR.INLINE_COLLECTION_CREATED'));
      onComplete();
    } catch (e) {
      toast.error(multiLineMsg(t('SIDEBAR.INLINE_COLLECTION_ERROR'), formatIpcError(e)));
      setIsCreating(false);
    }
  }, [isCreating, defaultLocation, dispatch, onCancel, onComplete, t]);

  // Click outside to create
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        clickedOutsideRef.current = true;
        handleCreate();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleCreate]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCreate();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  return (
    <StyledWrapper>
      <div className="inline-collection-creator" ref={containerRef}>
        <div className="input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="inline-collection-input"
            defaultValue={t('SIDEBAR.INLINE_COLLECTION_UNTITLED')}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            disabled={isCreating}
          />
          <button
            className="cog-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              openingAdvancedRef.current = true;
              onOpenAdvanced(inputRef.current?.value?.trim());
            }}
            title={t('SIDEBAR.INLINE_COLLECTION_ADVANCED_OPTIONS')}
            disabled={isCreating}
          >
            <IconSettings size={13} strokeWidth={1.5} />
          </button>
        </div>
        <div className="inline-actions">
          <button
            className="inline-action-btn save"
            onClick={handleCreate}
            onMouseDown={(e) => e.preventDefault()}
            title={t('SIDEBAR.INLINE_COLLECTION_CREATE')}
            disabled={isCreating}
          >
            <IconCheck size={14} strokeWidth={2} />
          </button>
          <button
            className="inline-action-btn cancel"
            onClick={handleCancel}
            onMouseDown={(e) => e.preventDefault()}
            title={t('SIDEBAR.INLINE_COLLECTION_CANCEL')}
            disabled={isCreating}
          >
            <IconX size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default InlineCollectionCreator;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconArrowRight, IconCopy, IconCheck, IconAlertTriangle } from '@tabler/icons';

import Modal from 'components/Modal';
import Portal from 'components/Portal';
import { findCollectionByUid, getCollectionVersion, isOpenCollectionFormat } from 'utils/collections/index';
import { saveCollectionVersion } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper, { ModalTitle } from './StyledWrapper';

const CollectionNotFound = ({ onClose }) => (
  <Portal>
    <Modal size="sm" title="Change Collection Version" confirmText="Close" handleConfirm={onClose} hideCancel>
      <StyledWrapper className="w-[480px]">
        <div className="flex items-center gap-2 text-warning">
          <IconAlertTriangle size={16} className="shrink-0" />
          <span>Collection not found. It may have been deleted or is no longer available.</span>
        </div>
      </StyledWrapper>
    </Modal>
  </Portal>
);

const ChangeCollectionVersion = ({ collectionUid, onClose }) => {
  const dispatch = useDispatch();
  const inputRef = useRef(null);
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));

  const currentVersion = getCollectionVersion(collection);
  const isYml = isOpenCollectionFormat(collection);
  const targetKey = isYml ? 'info.version' : 'collectionVersion';
  const targetFile = isYml ? 'opencollection.yml' : 'bruno.json';
  const [newVersion, setNewVersion] = useState(currentVersion);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const trimmedVersion = newVersion.trim();
  const canSubmit = useMemo(
    () => trimmedVersion.length > 0 && trimmedVersion !== currentVersion,
    [trimmedVersion, currentVersion]
  );

  const handleConfirm = () => {
    if (!canSubmit || isSaving) return;
    setIsSaving(true);
    dispatch(saveCollectionVersion(collectionUid, trimmedVersion))
      .then(() => onClose())
      .catch(() => setIsSaving(false));
  };

  const handleCopy = () => {
    if (!trimmedVersion || !navigator.clipboard) return;
    navigator.clipboard.writeText(trimmedVersion)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }).catch(() => {});
  };

  if (!collection) {
    return <CollectionNotFound onClose={onClose} />;
  }

  return (
    <Portal>
      <Modal
        size="md"
        customHeader={<ModalTitle>Change Collection Version</ModalTitle>}
        confirmText={isSaving ? 'Updating...' : 'Update Version'}
        cancelText="Cancel"
        handleConfirm={handleConfirm}
        handleCancel={onClose}
        confirmDisabled={!canSubmit || isSaving}
        dataTestId="change-version"
      >
        <StyledWrapper className="w-[560px]">
          <div className="subheader" data-testid="change-version-collection">
            Collection: <span className="collection-name">{collection.name}</span>
          </div>

          <div className="version-card">
            <div className="version-row">
              <div className="version-col">
                <div className="col-label">Current Version</div>
                <div className="current-value" data-testid="change-version-current">
                  {currentVersion || <span className="text-muted italic">Not Set</span>}
                </div>
              </div>

              <IconArrowRight size={18} className="arrow" stroke={1.5} />

              <div className="version-col">
                <div className="col-label">New Version</div>
                <div className="input-wrap">
                  <input
                    ref={inputRef}
                    type="text"
                    className="textbox w-full"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    placeholder="e.g. v1.0.0"
                    maxLength={50}
                    value={newVersion}
                    onChange={(e) => setNewVersion(e.target.value)}
                    data-testid="change-version-input"
                  />
                  <button
                    type="button"
                    className="copy-btn"
                    aria-label={copied ? 'Copied' : 'Copy version'}
                    onClick={handleCopy}
                    disabled={!trimmedVersion}
                    data-testid="change-version-copy"
                  >
                    {copied ? <IconCheck size={15} stroke={1.5} /> : <IconCopy size={15} stroke={1.5} />}
                  </button>
                </div>
              </div>
            </div>

            <p className="preview m-0" data-testid="change-version-preview">
              Updates <strong>{targetKey}</strong> in {targetFile} from{' '}
              <span className="old">{currentVersion || <span className="text-muted italic not-set">(Not Set)</span>}</span>
              <IconArrowRight size={13} className="preview-arrow" stroke={1.5} />
              <span className="new">{trimmedVersion || '…'}</span>
            </p>
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default ChangeCollectionVersion;

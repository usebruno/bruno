import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import Modal from 'components/Modal';
import { useDispatch } from 'react-redux';
import { IconFiles, IconTrash, IconX, IconLoader2, IconAlertTriangle } from '@tabler/icons';
import { removeCollection } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

const RemoveCollection = ({ onClose, collection }) => {
  const dispatch = useDispatch();
  const [deleteFromFileSystem, setDeleteFromFileSystem] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const inputRef = useRef(null);

  const isNameMatching = collectionName === collection.name;

  useEffect(() => {
    if (deleteFromFileSystem && inputRef.current) {
      inputRef.current.focus();
    }
  }, [deleteFromFileSystem]);

  const handleConfirm = async () => {
    if (deleteFromFileSystem && !isNameMatching) return;
    setIsClosing(true);
    try {
      await dispatch(removeCollection(collection.uid, deleteFromFileSystem));
      toast.success(deleteFromFileSystem ? 'Collection deleted' : 'Collection closed');
      onClose();
    } catch {
      toast.error(deleteFromFileSystem 
        ? 'Error deleting the collection'
        : 'Error closing the collection'
      );
      setIsClosing(false);
    }
  };

  return (
    <Modal 
      size="md"
      title={
        <div>
          {isClosing 
            ? (deleteFromFileSystem ? "Deleting Collection" : "Closing Collection")
            : (deleteFromFileSystem ? "Delete Collection" : "Close Collection")
          }
        </div>
      }
      confirmText={isClosing ? (deleteFromFileSystem ? "Deleting..." : "Closing...") : (deleteFromFileSystem ? "Delete" : "Close")}
      handleConfirm={handleConfirm}
      handleCancel={onClose}
      confirmDisabled={isClosing || (deleteFromFileSystem && !isNameMatching)}
      cancelDisabled={isClosing}
      confirmClassName={deleteFromFileSystem ? 'danger' : 'primary'}
    >
      <StyledWrapper>
        <div className="collection-info">
          <div className="flex items-center gap-2.5">
            <IconFiles size={18} />
            <div>
              <div className="collection-name">{collection.name}</div>
              <div className="collection-path">{collection.pathname}</div>
            </div>
          </div>
        </div>

        <div className="checkbox-wrapper">
          <label>
            <input
              type="checkbox"
              checked={deleteFromFileSystem}
              onChange={(e) => {
                setDeleteFromFileSystem(e.target.checked);
                setCollectionName('');
              }}
              disabled={isClosing}
            />
            <span>Delete collection folder and all contents</span>
          </label>
        </div>

        {deleteFromFileSystem && (
          <div className="confirm-input">
            <label>Type <strong>{collection.name}</strong> to confirm deletion:</label>
            <input
              ref={inputRef}
              type="text"
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder={collection.name}
              disabled={isClosing}
              autoComplete="off"
            />
          </div>
        )}

        <div className={`warning-message ${deleteFromFileSystem ? 'danger' : ''}`}>
          {deleteFromFileSystem ? (
            <>
              <IconTrash size={14} />
              <span>This action cannot be undone.</span>
            </>
          ) : (
            <>
              <IconFiles size={14} />
              <span>Collection will remain on your file system.</span>
            </>
          )}
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default RemoveCollection;

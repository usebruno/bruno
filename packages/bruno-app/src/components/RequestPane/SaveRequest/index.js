import React, { useState, useEffect } from 'react';
import { faFolder } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import StyledWrapper from './StyledWrapper';
import Modal from '@components//Modal';

const SaveRequest = ({ items, onClose }) => {
  const [showFolders, setShowFolders] = useState([]);

  useEffect(() => {
    setShowFolders(items || []);
  }, [items]);

  const handleFolderClick = (folder) => {
    let subFolders = [];
    if (folder.items && folder.items.length) {
      for (let item of folder.items) {
        if (item.items) {
          subFolders.push(item);
        }
      }

      if (subFolders.length) {
        setShowFolders(subFolders);
      }
    }
  };

  return (
    <StyledWrapper>
      <Modal
        size="md"
        title="Save Request"
        confirmText="Save"
        cancelText="Cancel"
        handleCancel={onClose}
        handleConfirm={onClose}
      >
        <p className="mb-2">Select a folder to save request:</p>
        <div className="folder-list">
          {showFolders && showFolders.length
            ? showFolders.map((folder) => (
                <div key={folder.uid} className="folder-name" onClick={() => handleFolderClick(folder)}>
                  <FontAwesomeIcon className="mr-3 text-gray-500" icon={faFolder} style={{ fontSize: 20 }} />
                  {folder.name}
                </div>
              ))
            : null}
        </div>
      </Modal>
    </StyledWrapper>
  );
};

export default SaveRequest;

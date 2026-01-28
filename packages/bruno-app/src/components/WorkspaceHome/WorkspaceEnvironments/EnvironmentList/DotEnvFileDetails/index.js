import React, { useState } from 'react';
import { IconTrash } from '@tabler/icons';
import DeleteDotEnvFile from 'components/Environments/EnvironmentSettings/DeleteDotEnvFile';
import StyledWrapper from './StyledWrapper';

const DotEnvFileDetails = ({
  title,
  children,
  onDelete,
  dotEnvExists,
  viewMode,
  onViewModeChange
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <StyledWrapper>
      <div className="header">
        <h3 className="title">{title}</h3>
        <div className="actions">
          {dotEnvExists && (
            <>
              <div className="view-toggle">
                <button
                  className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => onViewModeChange && onViewModeChange('table')}
                >
                  Table
                </button>
                <button
                  className={`toggle-btn ${viewMode === 'raw' ? 'active' : ''}`}
                  onClick={() => onViewModeChange && onViewModeChange('raw')}
                >
                  Raw
                </button>
              </div>
              <button onClick={handleDeleteClick} title="Delete .env file" className="action-btn delete-btn">
                <IconTrash size={15} strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <DeleteDotEnvFile
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleConfirmDelete}
          filename={title}
        />
      )}

      <div className="content">
        {children}
      </div>
    </StyledWrapper>
  );
};

export default DotEnvFileDetails;

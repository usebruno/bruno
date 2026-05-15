import React, { useState } from 'react';
import { IconTrash } from '@tabler/icons';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
              <div className="view-toggle" role="group" aria-label={t('ENVIRONMENTS.VIEW_MODE')}>
                <button
                  type="button"
                  className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
                  onClick={() => onViewModeChange?.('table')}
                  aria-pressed={viewMode === 'table'}
                >
                  {t('ENVIRONMENTS.TABLE')}
                </button>
                <button
                  type="button"
                  className={`toggle-btn ${viewMode === 'raw' ? 'active' : ''}`}
                  onClick={() => onViewModeChange?.('raw')}
                  aria-pressed={viewMode === 'raw'}
                  data-testid="dotenv-view-raw"
                >
                  {t('ENVIRONMENTS.RAW')}
                </button>
              </div>
              <button type="button" onClick={handleDeleteClick} title={t('ENVIRONMENTS.DELETE_DOTENV_FILE')} className="action-btn delete-btn">
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

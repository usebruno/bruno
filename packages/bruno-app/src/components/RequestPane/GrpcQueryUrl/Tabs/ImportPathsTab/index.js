import React from 'react';
import { IconFolder, IconSettings, IconAlertCircle, IconFileImport } from '@tabler/icons';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';

const ImportPathsTab = ({
  collectionImportPaths,
  invalidImportPaths,
  onOpenCollectionProtobufSettings,
  onBrowseImportPath,
  onToggleImportPath
}) => {
  const { t } = useTranslation();

  return (
    <StyledWrapper>
      {collectionImportPaths && collectionImportPaths.length > 0 && (
        <div className="content-wrapper">
          <div className="header-wrapper">
            <div className="header-text">{t('GRPC_IMPORT_PATHS.FROM_SETTINGS')}</div>
            <button
              onClick={onOpenCollectionProtobufSettings}
              className="settings-button"
            >
              <IconSettings size={16} strokeWidth={1.5} />
            </button>
          </div>

          {invalidImportPaths.length > 0 && (
            <div className="error-wrapper">
              <p className="error-text">
                <IconAlertCircle size={16} strokeWidth={1.5} style={{ marginRight: '0.25rem' }} />
                {t('GRPC_IMPORT_PATHS.SOME_NOT_FOUND')}
                {' '}
                <button
                  onClick={onOpenCollectionProtobufSettings}
                  className="error-link"
                >
                  {t('GRPC_IMPORT_PATHS.MANAGE_IMPORTS')}
                </button>
              </p>
            </div>
          )}

          <div className="items-container">
            {collectionImportPaths.map((importPath, index) => {
              const isInvalid = !importPath.exists;

              return (
                <div
                  key={`collection-import-${index}`}
                  className={`item-wrapper ${!isInvalid ? 'valid' : ''}`}
                >
                  <div className="item-content">
                    <div className="item-left">
                      <div className="checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={importPath.enabled}
                          disabled={isInvalid}
                          onChange={() => onToggleImportPath(index)}
                          className="checkbox"
                          title={importPath.enabled ? t('GRPC_IMPORT_PATHS.ENABLED') : t('GRPC_IMPORT_PATHS.DISABLED')}
                        />
                      </div>
                      <IconFolder size={20} strokeWidth={1.5} style={{ marginRight: '0.5rem', color: 'inherit' }} />
                      <div className="item-text">
                        {importPath.path}
                        {isInvalid && (
                          <span className="invalid-icon">
                            <IconAlertCircle size={16} strokeWidth={1.5} style={{ margin: '0 0.25rem' }} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(!collectionImportPaths || collectionImportPaths.length === 0) && (
        <div className="empty-wrapper">
          <div className="empty-text">
            {t('GRPC_IMPORT_PATHS.NO_PATHS')}
          </div>
        </div>
      )}

      <div className="button-wrapper">
        <button
          className="browse-button"
          onClick={onBrowseImportPath}
        >
          <IconFileImport size={16} strokeWidth={1.5} style={{ marginRight: '0.25rem' }} />
          {t('GRPC_IMPORT_PATHS.BROWSE')}
        </button>
      </div>
    </StyledWrapper>
  );
};

export default ImportPathsTab;

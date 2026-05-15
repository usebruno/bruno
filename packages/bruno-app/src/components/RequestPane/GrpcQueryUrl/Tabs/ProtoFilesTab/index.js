import React from 'react';
import { IconFile, IconSettings, IconAlertCircle } from '@tabler/icons';
import { getBasename } from 'utils/common/path';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';

const ProtoFilesTab = ({
  collectionProtoFiles,
  invalidProtoFiles,
  protoFilePath,
  collection,
  onSelectCollectionProtoFile,
  onOpenCollectionProtobufSettings,
  onSelectProtoFile
}) => {
  const { t } = useTranslation();

  return (
    <StyledWrapper>
      {collectionProtoFiles && collectionProtoFiles.length > 0 && (
        <div className="content-wrapper">
          <div className="header-wrapper">
            <div className="header-text">{t('GRPC_PROTO_FILES.FROM_SETTINGS')}</div>
            <button
              onClick={onOpenCollectionProtobufSettings}
              className="settings-button"
            >
              <IconSettings size={16} strokeWidth={1.5} />
            </button>
          </div>

          {invalidProtoFiles.length > 0 && (
            <div className="error-wrapper">
              <p className="error-text">
                <IconAlertCircle size={16} strokeWidth={1.5} style={{ marginRight: '0.25rem' }} />
                {t('GRPC_PROTO_FILES.SOME_NOT_FOUND')}
                {' '}
                <button
                  onClick={onOpenCollectionProtobufSettings}
                  className="error-link"
                >
                  {t('GRPC_PROTO_FILES.MANAGE_FILES')}
                </button>
              </p>
            </div>
          )}

          <div className="items-container">
            {collectionProtoFiles.map((protoFile, index) => {
              const isSelected = protoFilePath === protoFile.path;
              const isInvalid = !protoFile.exists;

              return (
                <div
                  key={`collection-proto-${index}`}
                  className={`item-wrapper ${!isInvalid ? 'valid' : ''} ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    if (!isInvalid) {
                      onSelectCollectionProtoFile(protoFile);
                    }
                  }}
                >
                  <div className="item-content">
                    <div className="item-icon">
                      <IconFile size={20} strokeWidth={1.5} />
                    </div>
                    <div className="item-details">
                      <div className="item-title">
                        {getBasename(collection.pathname, protoFile.path)}
                        {isInvalid && (
                          <span className="invalid-icon">
                            <IconAlertCircle size={14} strokeWidth={1.5} />
                          </span>
                        )}
                      </div>
                      <div className="item-path">
                        {protoFile.path}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(!collectionProtoFiles || collectionProtoFiles.length === 0) && (
        <div className="empty-wrapper">
          <div className="empty-text">
            {t('GRPC_PROTO_FILES.NO_FILES')}
          </div>
        </div>
      )}

      <div className="button-wrapper">
        <button
          className="browse-button"
          onClick={onSelectProtoFile}
        >
          <IconFile size={16} strokeWidth={1.5} style={{ marginRight: '0.25rem' }} />
          {t('GRPC_PROTO_FILES.BROWSE')}
        </button>
      </div>
    </StyledWrapper>
  );
};

export default ProtoFilesTab;

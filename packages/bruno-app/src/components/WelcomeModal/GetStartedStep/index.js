import React from 'react';
import { IconPlus, IconDownload, IconFileImport, IconSend } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import { useTranslation } from 'react-i18next';

const GetStartedStep = ({ onCreateCollection, onImportCollection, onOpenCollection, onStartRequest }) => {
  const { t } = useTranslation();

  return (
    <StyledWrapper className="step-body">
      <div className="step-label">{t('WELCOME.YOUR_FIRST_COLLECTION')}</div>
      <div className="step-title">{t('WELCOME.ALL_SET_TITLE')}</div>
      <div className="step-description">
        {t('WELCOME.ALL_SET_DESC')}
      </div>

      <div className="primary-actions">
        <button className="primary-action-card" onClick={onCreateCollection}>
          <div className="card-icon">
            <IconPlus size={20} stroke={1.5} />
          </div>
          <div className="card-title">{t('WELCOME.CREATE_COLLECTION')}</div>
          <div className="card-desc">{t('WELCOME.CREATE_COLLECTION_DESC')}</div>
        </button>

        <button className="primary-action-card" onClick={onImportCollection}>
          <div className="card-icon">
            <IconDownload size={20} stroke={1.5} />
          </div>
          <div className="card-title">{t('WELCOME.IMPORT_COLLECTION')}</div>
          <div className="card-desc">{t('WELCOME.IMPORT_COLLECTION_DESC')}</div>
        </button>
      </div>

      <div className="secondary-actions">
        <button className="secondary-action" onClick={onOpenCollection}>
          <span className="secondary-icon">
            <IconFileImport size={16} stroke={1.5} />
          </span>
          <div>
            <div className="secondary-label">{t('WELCOME.OPEN_EXISTING')}</div>
            <div className="secondary-desc">{t('WELCOME.OPEN_EXISTING_DESC')}</div>
          </div>
        </button>
        <button className="secondary-action" onClick={onStartRequest}>
          <span className="secondary-icon">
            <IconSend size={16} stroke={1.5} />
          </span>
          <div>
            <div className="secondary-label">{t('WELCOME.START_REQUEST')}</div>
            <div className="secondary-desc">{t('WELCOME.START_REQUEST_DESC')}</div>
          </div>
        </button>
      </div>
    </StyledWrapper>
  );
};

export default GetStartedStep;

import React from 'react';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';

const StorageStep = ({ collectionLocation, onBrowse }) => {
  const { t } = useTranslation();
  return (
    <StyledWrapper className="step-body">
      <div className="step-label">{t('WELCOME.STORAGE')}</div>
      <div className="step-title">{t('WELCOME.STORAGE_TITLE')}</div>
      <div className="step-description">
        {t('WELCOME.STORAGE_DESC')}
      </div>

      <div className="location-input-group">
        <div
          className="location-path-display"
          onClick={onBrowse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onBrowse();
            }
          }}
          role="button"
          tabIndex={0}
        >
          {collectionLocation ? (
            <span className="path-text">{collectionLocation}</span>
          ) : (
            <span className="path-text path-placeholder">{t('WELCOME.CHOOSE_FOLDER')}</span>
          )}
          <span className="browse-label">{t('COMMON.BROWSE')}</span>
        </div>
      </div>
      <div className="location-hint">
        {t('WELCOME.STORAGE_HINT')}
      </div>
    </StyledWrapper>
  );
};

export default StorageStep;

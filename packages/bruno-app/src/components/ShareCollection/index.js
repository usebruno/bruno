import React, { useState, useMemo } from 'react';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { IconCheck, IconAlertTriangle, IconFileExport } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import exportPostmanCollection from 'utils/exporters/postman-collection';
import exportOpenCollection from 'utils/exporters/opencollection';
import { cloneDeep } from 'lodash';
import { transformCollectionToSaveToExportAsFile } from 'utils/collections/index';
import { useSelector } from 'react-redux';
import { findCollectionByUid, areItemsLoading } from 'utils/collections/index';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

const EXPORT_FORMATS = {
  ZIP: 'zip',
  YAML: 'yaml',
  POSTMAN: 'postman'
};

const ShareCollection = ({ onClose, collectionUid }) => {
  const { t } = useTranslation();
  const collection = useSelector((state) => findCollectionByUid(state.collections.collections, collectionUid));
  const isCollectionLoading = areItemsLoading(collection);
  const [selectedFormat, setSelectedFormat] = useState(EXPORT_FORMATS.ZIP);
  const [isExporting, setIsExporting] = useState(false);

  const hasNonExportableRequestTypes = useMemo(() => {
    let types = new Set();
    const checkItem = (item) => {
      if (item.type === 'grpc-request') {
        types.add('gRPC');
        return true;
      }
      if (item.type === 'ws-request') {
        types.add('WebSocket');
        return true;
      }
      if (item.items) {
        return item.items.some(checkItem);
      }
      return false;
    };
    return {
      has: collection?.items?.filter(checkItem).length || false,
      types: [...types]
    };
  }, [collection]);

  const handleExportZip = async () => {
    try {
      const { ipcRenderer } = window;
      const result = await ipcRenderer.invoke('renderer:export-collection-zip', collection.pathname, collection.name);
      if (result.success) {
        toast.success(t('SHARE_COLLECTION.EXPORT_SUCCESS'));
      }
    } catch (error) {
      toast.error(t('SHARE_COLLECTION.EXPORT_ERROR') + error.message);
    }
  };

  const handleExportYaml = () => {
    const collectionCopy = cloneDeep(collection);
    exportOpenCollection(transformCollectionToSaveToExportAsFile(collectionCopy));
  };

  const handleExportPostman = () => {
    const collectionCopy = cloneDeep(collection);
    exportPostmanCollection(collectionCopy);
  };

  const handleProceed = async () => {
    if (isCollectionLoading || isExporting) return;

    setIsExporting(true);
    try {
      switch (selectedFormat) {
        case EXPORT_FORMATS.ZIP:
          await handleExportZip();
          break;
        case EXPORT_FORMATS.YAML:
          handleExportYaml();
          break;
        case EXPORT_FORMATS.POSTMAN:
          handleExportPostman();
          break;
      }
      onClose();
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const isDisabled = isCollectionLoading || isExporting;

  return (
    <Modal size="lg" title={t('SHARE_COLLECTION.TITLE')} handleCancel={onClose} hideFooter>
      <StyledWrapper className="flex flex-col">
        <p className="text-sm mb-4">
          {t('SHARE_COLLECTION.DESCRIPTION_PREFIX')}{' '}
          <a
            href="https://opencollection.com"
            target="_blank"
            rel="noopener noreferrer"
            className="opencollection-link"
          >
            OpenCollection
          </a>
          {' '}- {t('SHARE_COLLECTION.DESCRIPTION_SUFFIX')}
        </p>

        {/* Bruno Format Section */}
        <div className="section-title">{t('SHARE_COLLECTION.BRUNO_FORMAT')}</div>
        <div className="bruno-format-grid mb-6">
          {/* ZIP Option */}
          <div
            className={`format-card ${selectedFormat === EXPORT_FORMATS.ZIP ? 'selected' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isDisabled && setSelectedFormat(EXPORT_FORMATS.ZIP)}
          >
            <div className="card-header">
              <span className="card-title">{t('SHARE_COLLECTION.ZIP_TITLE')}</span>
              <span className="recommended-badge">{t('SHARE_COLLECTION.RECOMMENDED')}</span>
            </div>
            <p className="card-description">{t('SHARE_COLLECTION.ZIP_DESCRIPTION')}</p>
            <div className="feature-list">
              <div className="feature-item">
                <IconCheck size={14} className="checkmark" />
                <span>{t('SHARE_COLLECTION.ZIP_FEATURE_1')}</span>
              </div>
              <div className="feature-item">
                <IconCheck size={14} className="checkmark" />
                <span>{t('SHARE_COLLECTION.ZIP_FEATURE_2')}</span>
              </div>
              <div className="feature-item">
                <IconCheck size={14} className="checkmark" />
                <span>{t('SHARE_COLLECTION.ZIP_FEATURE_3')}</span>
              </div>
            </div>
            <p className="best-for">{t('SHARE_COLLECTION.ZIP_BEST_FOR')}</p>
          </div>

          {/* Single File YAML Option */}
          <div
            className={`format-card ${selectedFormat === EXPORT_FORMATS.YAML ? 'selected' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isDisabled && setSelectedFormat(EXPORT_FORMATS.YAML)}
          >
            <div className="card-header">
              <span className="card-title">{t('SHARE_COLLECTION.YAML_TITLE')}</span>
            </div>
            <p className="card-description">{t('SHARE_COLLECTION.YAML_DESCRIPTION')}</p>
            <div className="feature-list">
              <div className="feature-item">
                <IconCheck size={14} className="checkmark" />
                <span>{t('SHARE_COLLECTION.YAML_FEATURE_1')}</span>
              </div>
              <div className="feature-item">
                <IconCheck size={14} className="checkmark" />
                <span>{t('SHARE_COLLECTION.YAML_FEATURE_2')}</span>
              </div>
            </div>
            <p className="best-for">{t('SHARE_COLLECTION.YAML_BEST_FOR')}</p>
          </div>
        </div>

        <div className="section-title">{t('SHARE_COLLECTION.OTHER_FORMAT')}</div>
        <div className="other-format-grid">
          <div
            className={`other-format-card ${selectedFormat === EXPORT_FORMATS.POSTMAN ? 'selected' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isDisabled && setSelectedFormat(EXPORT_FORMATS.POSTMAN)}
          >
            <div className="format-icon">
              <IconFileExport size={28} strokeWidth={1.5} />
            </div>
            <div className="format-info">
              <div className="format-name">{t('SHARE_COLLECTION.POSTMAN')}</div>
              <div className="format-description">{t('SHARE_COLLECTION.POSTMAN_DESCRIPTION')}</div>
            </div>
          </div>
        </div>

        {selectedFormat === EXPORT_FORMATS.POSTMAN && hasNonExportableRequestTypes.has && (
          <div className="flex items-center mt-4 p-3 rounded" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
            <IconAlertTriangle size={16} className="mr-2 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <span className="text-sm" style={{ color: '#f59e0b' }}>
              {t('SHARE_COLLECTION.WARNING_PREFIX')}{hasNonExportableRequestTypes.types.join(', ')}{t('SHARE_COLLECTION.WARNING_SUFFIX')}
            </span>
          </div>
        )}

        <div className="modal-footer">
          <Button
            onClick={handleProceed}
            disabled={isDisabled}
            loading={isExporting}
          >
            {isExporting ? t('SHARE_COLLECTION.EXPORTING') : t('SHARE_COLLECTION.PROCEED')}
          </Button>
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default ShareCollection;

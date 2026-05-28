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

const EXPORT_FORMATS = {
  ZIP: 'zip',
  YAML: 'yaml',
  POSTMAN: 'postman'
};

const ShareCollection = ({ onClose, collectionUid }) => {
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
        toast.success('Collection exported successfully');
      }
    } catch (error) {
      toast.error('Failed to export collection: ' + error.message);
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
    <Modal size="lg" title="Share Collection" handleCancel={onClose} hideFooter>
      <StyledWrapper className="flex flex-col">
        <p className="text-sm mb-4">
          Bruno uses{' '}
          <a
            href="https://opencollection.com"
            target="_blank"
            rel="noopener noreferrer"
            className="opencollection-link"
          >
            OpenCollection
          </a>
          {' '}- An open format for API collections
        </p>

        {/* Bruno Format Section */}
        <div className="section-title">Bruno Format</div>
        <div className="bruno-format-grid mb-6">
          {/* ZIP Option */}
          <div
            className={`format-card ${selectedFormat === EXPORT_FORMATS.ZIP ? 'selected' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isDisabled && setSelectedFormat(EXPORT_FORMATS.ZIP)}
          >
            <div className="card-header">
              <span className="card-title">Bruno Collection (ZIP)</span>
              <span className="recommended-badge">Recommended</span>
            </div>
            <p className="card-description">OpenCollection format organized as folders and files</p>
            <div className="feature-list">
              <div className="feature-item">
                <IconCheck size={14} className="checkmark" />
                <span>Folder structure with individual .yml files</span>
              </div>
              <div className="feature-item">
                <IconCheck size={14} className="checkmark" />
                <span>Collaborate with your team via pull requests</span>
              </div>
              <div className="feature-item">
                <IconCheck size={14} className="checkmark" />
                <span>Extract and open directly in Bruno</span>
              </div>
            </div>
            <p className="best-for">Best for: Team collaboration, version control, publishing</p>
          </div>

          {/* Single File YAML Option */}
          <div
            className={`format-card ${selectedFormat === EXPORT_FORMATS.YAML ? 'selected' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isDisabled && setSelectedFormat(EXPORT_FORMATS.YAML)}
          >
            <div className="card-header">
              <span className="card-title">Single File (YAML)</span>
            </div>
            <p className="card-description">OpenCollection format bundled into one .yml file</p>
            <div className="feature-list">
              <div className="feature-item">
                <IconCheck size={14} className="checkmark" />
                <span>Everything in a single YAML file</span>
              </div>
              <div className="feature-item">
                <IconCheck size={14} className="checkmark" />
                <span>Paste in a gist or attach to an issue</span>
              </div>
            </div>
            <p className="best-for">Best for: Quick sharing as a single file</p>
          </div>
        </div>

        <div className="section-title">Other Format</div>
        <div className="other-format-grid">
          <div
            className={`other-format-card ${selectedFormat === EXPORT_FORMATS.POSTMAN ? 'selected' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => !isDisabled && setSelectedFormat(EXPORT_FORMATS.POSTMAN)}
          >
            <div className="format-icon">
              <IconFileExport size={28} strokeWidth={1.5} />
            </div>
            <div className="format-info">
              <div className="format-name">Postman</div>
              <div className="format-description">Export for Postman</div>
            </div>
          </div>
        </div>

        {selectedFormat === EXPORT_FORMATS.POSTMAN && hasNonExportableRequestTypes.has && (
          <div className="flex items-center mt-4 p-3 rounded" style={{ backgroundColor: 'rgba(251, 191, 36, 0.1)' }}>
            <IconAlertTriangle size={16} className="mr-2 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <span className="text-sm" style={{ color: '#f59e0b' }}>
              Note: {hasNonExportableRequestTypes.types.join(', ')} requests in this collection will not be exported
            </span>
          </div>
        )}

        <div className="modal-footer">
          <Button
            onClick={handleProceed}
            disabled={isDisabled}
            loading={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Proceed'}
          </Button>
        </div>
      </StyledWrapper>
    </Modal>
  );
};

export default ShareCollection;

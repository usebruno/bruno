import React, { useState } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal';
import { exportLocalEnvironments } from 'utils/exporters/environments/environment-export';
import toast from 'react-hot-toast';
import StyledWrapper from '../ExportModal/StyledWrapper';

const ExportAllModal = ({ onClose, collection }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('bru');

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const result = await exportLocalEnvironments(collection, selectedFormat);

      onClose();
    } catch (error) {
      console.error('Export error:', error);
      if (error.message === 'Export cancelled by user') {
        onClose();
      } else {
        toast.error(error.message || 'Failed to export environments');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="sm"
          title="Export All Local Environments"
          hideFooter={true}
          handleCancel={onClose}
        >
          <div className="export-content">
            <div className="export-message export-modal-message">
              Choose the export format
            </div>

            <div className="format-selection export-modal-format-selection">
              <label className="format-option">
                <input
                  type="radio"
                  name="format"
                  value="bru"
                  checked={selectedFormat === 'bru'}
                  onChange={e => setSelectedFormat(e.target.value)}
                  disabled={isExporting}
                />
                <span className="format-label bru-format-label">BRU (Individual files)</span>
              </label>
              <label className="format-option">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={selectedFormat === 'json'}
                  onChange={e => setSelectedFormat(e.target.value)}
                  disabled={isExporting}
                />
                <span className="format-label json-format-label">JSON (Individual files)</span>
              </label>
            </div>

            <div className="export-actions export-modal-actions">
              <button
                className="btn-cancel export-modal-cancel"
                onClick={onClose}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                className="btn-export w-24 h-7 export-modal-export"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export All'}
              </button>
            </div>
          </div>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default ExportAllModal;

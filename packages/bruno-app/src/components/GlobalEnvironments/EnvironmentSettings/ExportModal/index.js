import React, { useState } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal';
import { exportEnvironmentAsBru, exportEnvironmentAsJson } from 'utils/environments/export';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const ExportModal = ({ onClose, environment }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('json');

  const handleExport = async () => {
    try {
      setIsExporting(true);

      let result;
      if (selectedFormat === 'bru') {
        result = await exportEnvironmentAsBru(environment);
      } else if (selectedFormat === 'json') {
        result = await exportEnvironmentAsJson(environment);
      }

      // In test mode, store the result for the test to access
      if (window.__BRUNO_TEST_MODE__ && result) {
        window.__BRUNO_EXPORT_RESULT__ = result;
      }

      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to export environment');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Portal>
      <StyledWrapper>
        <Modal
          size="sm"
          title="Export"
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
                  value="json"
                  checked={selectedFormat === 'json'}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  disabled={isExporting}
                />
                <span className="format-label json-format-label">JSON</span>
              </label>

              <label className="format-option">
                <input
                  type="radio"
                  name="format"
                  value="bru"
                  checked={selectedFormat === 'bru'}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  disabled={isExporting}
                />
                <span className="format-label bru-format-label">BRU</span>
              </label>
            </div>

            <div className="export-actions export-modal-actions">
              <button
                className="btn btn-cancel export-modal-cancel"
                onClick={onClose}
                disabled={isExporting}
              >
                Cancel
              </button>
              <button
                className="btn btn-export export-modal-export"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </Modal>
      </StyledWrapper>
    </Portal>
  );
};

export default ExportModal;

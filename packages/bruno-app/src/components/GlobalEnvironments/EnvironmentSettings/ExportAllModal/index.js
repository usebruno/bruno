import React, { useState } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal';
import { exportGlobalEnvironments } from 'utils/exporters/environments/environment-export';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import StyledWrapper from '../ExportModal/StyledWrapper';

const ExportAllModal = ({ onClose }) => {
  const dispatch = useDispatch();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('json');
  const [filePath, setFilePath] = useState('');

  const browse = () => {
    dispatch(browseDirectory())
      .then((dirPath) => {
        // when the user closes the dialog without selecting anything dirPath will be false
        if (typeof dirPath === 'string') {
          setFilePath(dirPath);
        }
      })
      .catch((error) => {
        setFilePath('');
        console.error(error);
      });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      if (!filePath) {
        toast.error('Please select a location to save the files');
        return;
      }

      // pass the filePath to the export function
      const result = await exportGlobalEnvironments(selectedFormat, filePath);

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
          title="Export All Global Environments"
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
                  onChange={e => setSelectedFormat(e.target.value)}
                  disabled={isExporting}
                />
                <span className="format-label json-format-label">JSON (Single file)</span>
              </label>

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
            </div>

            <div className="location-input export-modal-location">
              <label htmlFor="export-global-all-location" className="block font-semibold mt-3">
                Location
              </label>
              <input
                id="export-global-all-location"
                type="text"
                className="block textbox mt-2 w-full cursor-pointer"
                value={filePath}
                onClick={browse}
                onChange={(e) => setFilePath(e.target.value)}
                disabled={isExporting}
                placeholder="Select directory to save files"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
              <div className="mt-1">
                <span
                  className="text-link cursor-pointer hover:underline"
                  onClick={browse}
                >
                  Browse
                </span>
              </div>
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

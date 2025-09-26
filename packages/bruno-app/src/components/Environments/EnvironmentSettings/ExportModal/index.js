import React, { useState } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal';
import { exportLocalEnvironmentAsBru, exportLocalEnvironmentAsJson } from 'utils/exporters/environments/environment-export';
import { browseDirectory } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';

const ExportModal = ({ onClose, environment, collection }) => {
  const dispatch = useDispatch();
  const [isExporting, setIsExporting] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('json');
  const [filePath, setFilePath] = useState('');

  const browse = () => {
    dispatch(browseDirectory())
      .then(dirPath => {
        // When the user closes the dialog without selecting anything dirPath will be false
        if (typeof dirPath === 'string') {
          setFilePath(dirPath);
        }
      })
      .catch(error => {
        setFilePath('');
        console.error(error);
      });
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);

      if (!filePath) {
        toast.error('Please select a location to save the file');
        return;
      }

      let result;
      if (selectedFormat === 'bru') {
        result = await exportLocalEnvironmentAsBru(environment, filePath);
      } else if (selectedFormat === 'json') {
        result = await exportLocalEnvironmentAsJson(environment, filePath);
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
                  onChange={e => setSelectedFormat(e.target.value)}
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
                  onChange={e => setSelectedFormat(e.target.value)}
                  disabled={isExporting}
                />
                <span className="format-label bru-format-label">BRU</span>
              </label>
            </div>

            <div className="location-input export-modal-location">
              <label htmlFor="export-location" className="block font-semibold mt-3">
                Location
              </label>
              <input
                id="export-location"
                type="text"
                className="block textbox mt-2 w-full cursor-pointer"
                value={filePath}
                onClick={browse}
                onChange={e => setFilePath(e.target.value)}
                disabled={isExporting}
                placeholder="Select directory to save file"
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

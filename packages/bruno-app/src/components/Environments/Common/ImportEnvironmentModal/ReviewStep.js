import React, { useState } from 'react';
import { useTheme } from 'styled-components';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import SearchInput from 'components/SearchInput';
import IconAlertTriangleFilled from 'components/Icons/IconAlertTriangleFilled';
import CountBadge from 'ui/CountBadge';
import { StyledWrapper } from './StyledWrapper';
import { pluralizeWord } from 'utils/common/index';
import EnvironmentGroup from './EnvironmentGroup';

const ReviewStep = ({
  modalTitle,
  modalTestId,
  onClose,
  handleConfirmImport,
  parsedData,
  selectedIndices,
  setSelectedIndices,
  resolutions,
  setResolutions
}) => {
  const theme = useTheme();
  const [searchText, setSearchText] = useState('');

  const totalEnvironments = parsedData.new.length + parsedData.duplicates.length;
  const isAllSelected = selectedIndices.size === totalEnvironments && totalEnvironments > 0;

  const toggleSelectAll = (checked) => {
    if (checked) {
      const allSelected = new Set();
      for (let i = 0; i < totalEnvironments; i++) {
        allSelected.add(i);
      }
      setSelectedIndices(allSelected);
    } else {
      setSelectedIndices(new Set());
    }
  };

  const toggleItemSelection = (env) => {
    const validEnvironments = [...parsedData.new, ...parsedData.duplicates];
    const idx = validEnvironments.indexOf(env);
    if (idx !== -1) {
      const newSelected = new Set(selectedIndices);
      if (newSelected.has(idx)) newSelected.delete(idx);
      else newSelected.add(idx);
      setSelectedIndices(newSelected);
    }
  };

  const setGroupResolution = (res) => {
    const newResolutions = new Map(resolutions);
    parsedData.duplicates.forEach((env) => {
      newResolutions.set(env, res);
    });
    setResolutions(newResolutions);
  };

  const setItemResolution = (env, res) => {
    setResolutions(new Map(resolutions).set(env, res));
  };

  const filteredNew = parsedData.new.filter((env) => env.name.toLowerCase().includes(searchText.toLowerCase()));
  const filteredDuplicates = parsedData.duplicates.filter((env) => env.name.toLowerCase().includes(searchText.toLowerCase()));

  return (
    <Portal>
      <Modal
        size="md"
        title={modalTitle}
        confirmText="Import"
        cancelText="Cancel"
        handleConfirm={handleConfirmImport}
        handleCancel={onClose}
        dataTestId={modalTestId}
        disableCloseOnOutsideClick
        footerLeft={(
          <div className="footer-left-content" data-testid="env-import-selected-count">
            <span style={{ color: theme.brand }}>{selectedIndices.size}</span> of {totalEnvironments} selected
          </div>
        )}
      >
        <StyledWrapper>
          <div className="modal-content">
            <div className="modal-header">
              Environments <CountBadge size="md" className="ml-2" data-testid="env-import-total-count">{totalEnvironments}</CountBadge>
            </div>

            <div className="scroll-area">
              <div className="environments-list-container">
                {parsedData.duplicates.length > 0 && (
                  <div className="warning-block" data-testid="import-duplicates-warning">
                    <div className="warning-header">
                      <IconAlertTriangleFilled size={16} className="mr-2 warning-icon" />
                      <span className="warning-title">{parsedData.duplicates.length} {pluralizeWord('environment', parsedData.duplicates.length)}&nbsp;</span> already {parsedData.duplicates.length > 1 ? 'exist' : 'exists'} with the same name
                    </div>
                  </div>
                )}

                <div className="search-block">
                  <div className="search-input-wrapper">
                    <SearchInput
                      searchText={searchText}
                      setSearchText={setSearchText}
                      placeholder="Search environments"
                      className="w-full h-[30px] !px-0"
                      leftIconClassName="!pl-2"
                      data-testid="env-search-input"
                      autoFocus={false}
                      inputClassName="h-[30px] text-xs"
                      iconSize={13}
                    />
                  </div>
                  <label className="select-all-wrapper">
                    <input
                      type="checkbox"
                      className="select-all-checkbox"
                      checked={isAllSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      data-testid="env-import-select-all"
                    />
                    <span className="select-all-text">Select all</span>
                  </label>
                </div>

                <EnvironmentGroup
                  title="Duplicates"
                  environments={filteredDuplicates}
                  countTestId="env-import-duplicates-count"
                  hasBorderBottom={parsedData.new.length > 0}
                  parsedData={parsedData}
                  selectedIndices={selectedIndices}
                  toggleItemSelection={toggleItemSelection}
                  resolutions={resolutions}
                  setItemResolution={setItemResolution}
                  showResolutions={true}
                  setGroupResolution={setGroupResolution}
                  searchText={searchText}
                  dataTestId="env-import-duplicates-group"
                />

                <EnvironmentGroup
                  title="New"
                  environments={filteredNew}
                  countTestId="env-import-new-count"
                  hasBorderBottom={false}
                  parsedData={parsedData}
                  selectedIndices={selectedIndices}
                  toggleItemSelection={toggleItemSelection}
                  showResolutions={false}
                  searchText={searchText}
                  dataTestId="env-import-new-group"
                />
              </div>
            </div>
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default ReviewStep;

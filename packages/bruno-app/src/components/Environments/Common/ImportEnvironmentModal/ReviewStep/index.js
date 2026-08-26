import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from 'styled-components';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import SearchInput from 'components/SearchInput';
import IconAlertTriangleFilled from 'components/Icons/IconAlertTriangleFilled';
import CountBadge from 'ui/CountBadge';
import { StyledWrapper } from './StyledWrapper';
import { pluralizeWord } from 'utils/common/index';
import EnvironmentGroup from '../EnvironmentGroup';

const ReviewStep = ({
  modalTitle,
  modalTestId,
  onClose,
  handleConfirmImport,
  items,
  selected,
  setSelected,
  resolutions,
  setResolutions
}) => {
  const theme = useTheme();
  const [searchText, setSearchText] = useState('');

  const newEnvs = useMemo(() => items.filter((env) => env.status === 'new'), [items]);
  const duplicates = useMemo(() => items.filter((env) => env.status === 'duplicate'), [items]);

  const totalEnvironments = items.filter((env) => env.status !== 'invalid').length;

  const normalizedSearchText = searchText.toLowerCase();

  const filteredNew = useMemo(() => newEnvs.filter((env) =>
    env.name.toLowerCase().includes(normalizedSearchText) || env.fileName?.toLowerCase().includes(normalizedSearchText)
  ), [newEnvs, normalizedSearchText]);

  const filteredDuplicates = useMemo(() => duplicates.filter((env) =>
    env.name.toLowerCase().includes(normalizedSearchText) || env.fileName?.toLowerCase().includes(normalizedSearchText)
  ), [duplicates, normalizedSearchText]);

  const isAllSelected = (filteredNew.length + filteredDuplicates.length) > 0
    && [...filteredNew, ...filteredDuplicates].every((e) => selected.has(e.id));

  const toggleSelectAll = useCallback((checked) => {
    if (checked) {
      const allSelected = new Set([...filteredNew, ...filteredDuplicates].map((e) => e.id));
      setSelected(allSelected);
    } else {
      setSelected(new Set());
    }
  }, [filteredNew, filteredDuplicates, setSelected]);

  const toggleItemSelection = useCallback((envId) => {
    setSelected((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(envId)) newSelected.delete(envId);
      else newSelected.add(envId);
      return newSelected;
    });
  }, [setSelected]);

  const setGroupResolution = useCallback((res) => {
    setResolutions((prev) => {
      const newResolutions = new Map(prev);
      duplicates.forEach((env) => {
        newResolutions.set(env.id, res);
      });
      return newResolutions;
    });
  }, [duplicates, setResolutions]);

  const setItemResolution = useCallback((envId, res) => {
    setResolutions((prev) => new Map(prev).set(envId, res));
  }, [setResolutions]);

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
            <span style={{ color: theme.brand }}>{selected.size}</span> of {totalEnvironments} selected
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
                {duplicates.length > 0 && (
                  <div className="warning-block" data-testid="import-duplicates-warning">
                    <div className="warning-header">
                      <IconAlertTriangleFilled size={16} className="mr-2 warning-icon" />
                      <span className="warning-title">{duplicates.length} {pluralizeWord('environment', duplicates.length)}&nbsp;</span> already {duplicates.length > 1 ? 'exist' : 'exists'} with the same name
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
                  selected={selected}
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
                  selected={selected}
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

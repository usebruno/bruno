import React, { useState } from 'react';
import { useTheme } from 'styled-components';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import SearchInput from 'components/SearchInput';
import IconAlertTriangleFilled from 'components/Icons/IconAlertTriangleFilled';
import IconFileAlertFilled from 'components/Icons/IconFileAlertFilled';
import CountBadge from 'ui/CountBadge';
import { StyledWrapper } from '../StyledWrapper';
import { pluralizeWord } from 'utils/common/index';
import EnvironmentGroup from '../EnvironmentGroup';
import { IconChevronDown, IconChevronRight } from '@tabler/icons';

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
  const [expandedGroups, setExpandedGroups] = useState({ invalid: true });

  const newEnvs = items.filter((env) => env.status === 'new');
  const duplicates = items.filter((env) => env.status === 'duplicate');
  const invalid = items.filter((env) => env.status === 'invalid');

  const totalEnvironments = newEnvs.length + duplicates.length;
  const totalParsedCount = totalEnvironments + invalid.length;
  const isAllSelected = selected.size === totalEnvironments && totalEnvironments > 0;

  const toggleSelectAll = (checked) => {
    if (checked) {
      const allSelected = new Set([...newEnvs, ...duplicates].map((e) => e.id));
      setSelected(allSelected);
    } else {
      setSelected(new Set());
    }
  };

  const toggleGroupExpanded = (group) => {
    setExpandedGroups({ ...expandedGroups, [group]: !expandedGroups[group] });
  };

  const toggleItemSelection = (envId) => {
    const newSelected = new Set(selected);
    if (newSelected.has(envId)) newSelected.delete(envId);
    else newSelected.add(envId);
    setSelected(newSelected);
  };

  const setGroupResolution = (res) => {
    const newResolutions = new Map(resolutions);
    duplicates.forEach((env) => {
      newResolutions.set(env.id, res);
    });
    setResolutions(newResolutions);
  };

  const setItemResolution = (envId, res) => {
    setResolutions(new Map(resolutions).set(envId, res));
  };

  const filteredNew = newEnvs.filter((env) => env.name.toLowerCase().includes(searchText.toLowerCase()));
  const filteredDuplicates = duplicates.filter((env) => env.name.toLowerCase().includes(searchText.toLowerCase()));

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
        confirmDisabled={totalEnvironments === 0}
        footerLeft={(
          <div className="footer-left-content" data-testid="env-import-selected-count">
            <span style={{ color: theme.brand }}>{selected.size}</span> of {totalEnvironments} selected
          </div>
        )}
      >
        <StyledWrapper>
          <div className="modal-content">
            <div className="modal-header">
              Environments <CountBadge size="md" className="ml-2" data-testid="env-import-total-count">{totalParsedCount}</CountBadge>
            </div>

            <div className="scroll-area">
              <div className="environments-list-container">
                {(duplicates.length > 0 || invalid.length > 0) && (
                  <div className="warning-block" data-testid="import-duplicates-warning">
                    {duplicates.length > 0 && (
                      <div className="warning-header">
                        <IconAlertTriangleFilled size={16} className="mr-2 warning-icon" />
                        <span className="warning-title">{duplicates.length} {pluralizeWord('environment', duplicates.length)}&nbsp;</span> already {duplicates.length > 1 ? 'exist' : 'exists'} with the same name
                      </div>
                    )}
                    {invalid.length > 0 && (
                      <div className="warning-header pt-2" data-testid="import-invalid-warning">
                        <IconFileAlertFilled size={16} className="mr-2 error-icon" />
                        <span className="warning-title">{invalid.length} {pluralizeWord('file', invalid.length)}&nbsp;</span> {invalid.length > 1 ? 'have' : 'has'} an invalid or unsupported format
                      </div>
                    )}
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

                {/* Invalid Group */}
                {invalid.length > 0 && (
                  <div
                    className={`group-container ${(duplicates.length > 0 || newEnvs.length > 0) ? 'has-border-bottom' : ''}`}
                    data-testid="env-import-invalid-group"
                  >
                    <div className="group-header">
                      <div className="group-title-wrapper" onClick={() => toggleGroupExpanded('invalid')}>
                        {expandedGroups.invalid ? <IconChevronDown size={16} className="text-zinc-500" /> : <IconChevronRight size={16} className="text-zinc-500" />}
                        <span className="group-title">Invalid or unsupported</span>
                        <CountBadge variant="danger" className="ml-2" data-testid="env-import-invalid-count">{invalid.length}</CountBadge>
                      </div>
                    </div>
                    {expandedGroups.invalid && (
                      <div className="group-list">
                        {invalid.map((item, idx) => (
                          <div key={idx} className="env-item" data-testid="env-import-invalid-item">
                            <div className="env-item-content">
                              <div className="env-name">{item.fileName}</div>
                              <div className="env-error" style={{ color: 'var(--color-text-subtext0)', fontSize: '0.75rem', marginTop: '0.125rem' }}>{item.error}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <EnvironmentGroup
                  title="Duplicates"
                  environments={filteredDuplicates}
                  countTestId="env-import-duplicates-count"
                  hasBorderBottom={newEnvs.length > 0}
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
                  hasBorderBottom={false}
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

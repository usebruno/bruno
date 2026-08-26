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
import InvalidEnvironmentGroup from '../InvalidEnvironmentGroup';

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
  const [expandedGroups, setExpandedGroups] = useState({ invalid: true, duplicates: true, new: true });

  const newEnvs = items.filter((env) => env.status === 'new');
  const duplicates = items.filter((env) => env.status === 'duplicate');
  const invalid = items.filter((env) => env.status === 'invalid');

  const totalEnvironments = newEnvs.length + duplicates.length;
  const totalParsedCount = totalEnvironments + invalid.length;

  const allExpanded = expandedGroups.invalid && expandedGroups.duplicates && expandedGroups.new;

  const toggleExpandAll = () => {
    const newState = !allExpanded;
    setExpandedGroups({ invalid: newState, duplicates: newState, new: newState });
  };

  const toggleGroupExpanded = (group) => {
    setExpandedGroups({ ...expandedGroups, [group]: !expandedGroups[group] });
  };

  const toggleGroupSelection = (groupEnvs, checked) => {
    const newSelected = new Set(selected);
    groupEnvs.forEach((env) => {
      if (checked) newSelected.add(env.id);
      else newSelected.delete(env.id);
    });
    setSelected(newSelected);
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
                      <div className="warning-header" data-testid="import-invalid-warning">
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
                  <button className="min-w-20" onClick={toggleExpandAll}>
                    <div className="expand-all-wrapper">{allExpanded ? 'Collapse all' : 'Expand all'}</div>
                  </button>
                </div>

                <div className="groups-scroll-area">
                  {/* Invalid Group */}
                  <InvalidEnvironmentGroup
                    invalid={invalid}
                    hasBorderBottom={duplicates.length > 0 || newEnvs.length > 0}
                    isExpanded={expandedGroups.invalid}
                    toggleExpanded={() => toggleGroupExpanded('invalid')}
                  />

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
                    isExpanded={expandedGroups.duplicates}
                    toggleExpanded={() => toggleGroupExpanded('duplicates')}
                    toggleGroupSelection={(checked) => toggleGroupSelection(filteredDuplicates, checked)}
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
                    isExpanded={expandedGroups.new}
                    toggleExpanded={() => toggleGroupExpanded('new')}
                    toggleGroupSelection={(checked) => toggleGroupSelection(filteredNew, checked)}
                    searchText={searchText}
                    dataTestId="env-import-new-group"
                  />
                </div>
              </div>
            </div>
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default ReviewStep;

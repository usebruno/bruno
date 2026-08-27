import React, { useState, useCallback, useMemo } from 'react';
import { useTheme } from 'styled-components';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import SearchInput from 'components/SearchInput';
import IconAlertTriangleFilled from 'components/Icons/IconAlertTriangleFilled';
import IconFileAlertFilled from 'components/Icons/IconFileAlertFilled';
import CountBadge from 'ui/CountBadge';
import { StyledWrapper } from './StyledWrapper';
import { pluralizeWord } from 'utils/common/index';
import EnvironmentGroup from '../EnvironmentGroup';
import { ENV_STATUS } from '../hooks/useEnvironmentImport';
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
  const [expandedGroups, setExpandedGroups] = useState({ [ENV_STATUS.INVALID]: true, [ENV_STATUS.DUPLICATE]: true, [ENV_STATUS.NEW]: true });

  const newEnvs = useMemo(() => items.filter((env) => env.status === ENV_STATUS.NEW), [items]);
  const duplicateEnvs = useMemo(() => items.filter((env) => env.status === ENV_STATUS.DUPLICATE), [items]);
  const invalidEnvs = items.filter((env) => env.status === ENV_STATUS.INVALID);

  const totalEnvironments = newEnvs.length + duplicateEnvs.length;
  const totalParsedCount = totalEnvironments + invalidEnvs.length;
  const isConfirmDisabled = selected.size === 0;

  const normalizedSearchText = searchText.toLowerCase();
  const matchesSearch = useCallback((env) =>
    env.name?.toLowerCase().includes(normalizedSearchText) || env.fileName?.toLowerCase().includes(normalizedSearchText),
  [normalizedSearchText]);

  const filteredNew = useMemo(() => newEnvs.filter(matchesSearch), [newEnvs, matchesSearch]);
  const filteredDuplicates = useMemo(() => duplicateEnvs.filter(matchesSearch), [duplicateEnvs, matchesSearch]);
  const filteredInvalid = useMemo(() => invalidEnvs.filter(matchesSearch), [invalidEnvs, matchesSearch]);

  const allExpanded = expandedGroups[ENV_STATUS.INVALID] && expandedGroups[ENV_STATUS.DUPLICATE] && expandedGroups[ENV_STATUS.NEW];

  const toggleExpandAll = () => {
    const newState = !allExpanded;
    setExpandedGroups({ [ENV_STATUS.INVALID]: newState, [ENV_STATUS.DUPLICATE]: newState, [ENV_STATUS.NEW]: newState });
  };

  const toggleGroupExpanded = useCallback((group) => {
    setExpandedGroups({ ...expandedGroups, [group]: !expandedGroups[group] });
  }, [expandedGroups]);

  const toggleGroupSelection = useCallback((groupEnvs, checked) => {
    const newSelected = new Set(selected);
    groupEnvs.forEach((env) => {
      if (checked) newSelected.add(env.id);
      else newSelected.delete(env.id);
    });
    setSelected(newSelected);
  }, [selected]);

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
      filteredDuplicates.forEach((env) => {
        newResolutions.set(env.id, res);
      });
      return newResolutions;
    });
  }, [filteredDuplicates, setResolutions]);

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
        confirmDisabled={isConfirmDisabled}
        footerClassName="pt-0"
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
                {(duplicateEnvs.length > 0 || invalidEnvs.length > 0) && (
                  <div className="warning-block" data-testid="import-duplicates-warning">
                    {duplicateEnvs.length > 0 && (
                      <div className="warning-header">
                        <IconAlertTriangleFilled size={16} className="mr-2 warning-icon" />
                        <span className="warning-title">{duplicateEnvs.length} {pluralizeWord('environment', duplicateEnvs.length)}&nbsp;</span> already {duplicateEnvs.length > 1 ? 'exist' : 'exists'} with the same name
                      </div>
                    )}
                    {invalidEnvs.length > 0 && (
                      <div className="warning-header" data-testid="import-invalid-warning">
                        <IconFileAlertFilled size={16} className="mr-2 error-icon" />
                        <span className="warning-title">{invalidEnvs.length} {pluralizeWord('file', invalidEnvs.length)}&nbsp;</span> {invalidEnvs.length > 1 ? 'have' : 'has'} an invalid or unsupported format
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
                      iconSize={14}
                    />
                  </div>
                  <button className="min-w-20" onClick={toggleExpandAll}>
                    <div className="expand-all-wrapper">{allExpanded ? 'Collapse all' : 'Expand all'}</div>
                  </button>
                </div>

                <div className="groups-scroll-area">
                  {/* Invalid Group */}
                  {filteredInvalid.length > 0 && (
                    <InvalidEnvironmentGroup
                      invalid={filteredInvalid}
                      isExpanded={expandedGroups[ENV_STATUS.INVALID]}
                      toggleExpanded={() => toggleGroupExpanded(ENV_STATUS.INVALID)}
                    />
                  )}

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
                    isExpanded={expandedGroups[ENV_STATUS.DUPLICATE]}
                    toggleExpanded={() => toggleGroupExpanded(ENV_STATUS.DUPLICATE)}
                    toggleGroupSelection={(checked) => toggleGroupSelection(filteredDuplicates, checked)}
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
                    isExpanded={expandedGroups[ENV_STATUS.NEW]}
                    toggleExpanded={() => toggleGroupExpanded(ENV_STATUS.NEW)}
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

import React, { useCallback, useMemo } from 'react';
import { useTheme } from 'styled-components';
import Portal from 'components/Portal';
import Modal from 'components/Modal';
import CountBadge from 'ui/CountBadge';
import { StyledWrapper } from './StyledWrapper';
import { ENV_STATUS } from '../hooks/useEnvironmentImport';

const ReviewStep = ({
  modalTitle,
  modalTestId,
  onClose,
  handleConfirmImport,
  items,
  selected,
  setSelected
}) => {
  const theme = useTheme();

  const isConfirmDisabled = selected.size === 0;

  const validItems = useMemo(() => items.filter((env) => env.status !== ENV_STATUS.INVALID), [items]);
  const allSelected = validItems.length > 0 && selected.size === validItems.length;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(validItems.map((env) => env.id)));
    }
  }, [allSelected, validItems, setSelected]);

  const toggleItemSelection = useCallback((envId) => {
    setSelected((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(envId)) newSelected.delete(envId);
      else newSelected.add(envId);
      return newSelected;
    });
  }, [setSelected]);

  const renderBadge = (status) => {
    if (status === ENV_STATUS.DUPLICATE) {
      return <span className="status-badge duplicate-badge">Already exists</span>;
    }
    if (status === ENV_STATUS.NEW) {
      return <span className="status-badge new-badge">New</span>;
    }
    if (status === ENV_STATUS.INVALID) {
      return <span className="status-badge invalid-badge">Can't import</span>;
    }
    return null;
  };

  return (
    <Portal>
      <Modal
        size="md"
        title={modalTitle}
        confirmText="Next"
        cancelText="Cancel"
        handleConfirm={handleConfirmImport}
        handleCancel={onClose}
        dataTestId={modalTestId}
        disableCloseOnOutsideClick
        confirmDisabled={isConfirmDisabled}
        footerClassName="pt-0"
        footerLeft={(
          <div className="footer-left-content" data-testid="env-import-selected-count">
            <span style={{ color: theme.brand }}>{selected.size}</span> of {items.length} selected
          </div>
        )}
      >
        <StyledWrapper>
          <div className="modal-content">
            <div className="list-header">
              <div className="list-title">
                Environment <CountBadge size="md" className="ml-2" data-testid="env-import-total-count">{items.length}</CountBadge>
              </div>
              <label className="select-all-label">
                <input
                  type="checkbox"
                  className="select-all-checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  data-testid="env-import-select-all"
                />
                Select all
              </label>
            </div>

            <div className="environments-list-container scroll-area">
              <div className="group-list">
                {items.map((env) => {
                  const isInvalid = env.status === ENV_STATUS.INVALID;
                  const isSelected = selected.has(env.id);
                  const displayName = env.filePath || env.fileName;

                  return (
                    <div key={env.id} className="env-item" data-testid="env-import-item">
                      <label className="env-item-label">
                        <input
                          type="checkbox"
                          className="env-item-checkbox"
                          checked={isSelected}
                          onChange={() => !isInvalid && toggleItemSelection(env.id)}
                          disabled={isInvalid}
                          data-testid="env-import-item-checkbox"
                        />
                        <div className="env-item-content">
                          <div className="env-name">{env.name || env.fileName}</div>
                          {displayName && (
                            <div className="env-filepath" title={displayName}>
                              {displayName}
                            </div>
                          )}
                          {isInvalid && env.error && (
                            <div className="env-error">{env.error}</div>
                          )}
                        </div>
                      </label>
                      <div className="env-item-badge">
                        {renderBadge(env.status)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </StyledWrapper>
      </Modal>
    </Portal>
  );
};

export default ReviewStep;

import React, { useState } from 'react';
import { IconChevronRight } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import MethodBadge from 'ui/MethodBadge';
import { useTranslation } from 'react-i18next';

const handleKeyDown = (toggle) => (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggle();
  }
};

const ConfirmGroup = ({ group }) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = () => setExpanded((prev) => !prev);
  return (
    <div className={`confirm-group type-${group.type}`}>
      <div
        className="confirm-group-header"
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={handleKeyDown(toggle)}
      >
        <IconChevronRight size={14} className={`chevron ${expanded ? 'expanded' : ''}`} />
        <span className="confirm-group-label">{group.label}</span>
        <span className="confirm-group-count">{group.endpoints.length}</span>
      </div>
      {expanded && (
        <div className="endpoints-list">
          {group.endpoints.map((ep, i) => (
            <div key={ep.id || i} className="endpoint-row">
              <MethodBadge method={ep.method} />
              <span className="endpoint-path">{ep.path}</span>
              {(ep.summary || ep.name) && (
                <span className="endpoint-summary">{ep.summary || ep.name}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ConfirmSyncModal = ({ groups, onCancel, onSync, isSyncing }) => {
  const { t } = useTranslation();
  const hasNoChanges = groups.length === 0;

  return (
    <Modal
      size="md"
      title={t('OPENAPI_SYNC.CONFIRM_SYNC')}
      handleCancel={onCancel}
      hideFooter={true}
    >
      <div className="sync-confirm-modal">
        {hasNoChanges ? (
          <p className="sync-confirm-description">
            {t('OPENAPI_SYNC.CONFIRM_SYNC_NO_CHANGES_DESC')}
          </p>
        ) : (
          <>
            <p className="sync-confirm-description">
              {t('OPENAPI_SYNC.CONFIRM_SYNC_DESC')}
            </p>

            <div className="sync-confirm-groups">
              {groups.map((group, idx) => (
                <ConfirmGroup key={idx} group={group} />
              ))}
            </div>
          </>
        )}

        <div className="sync-confirm-actions">
          <Button variant="ghost" color="secondary" onClick={onCancel}>
            {t('COMMON.CANCEL')}
          </Button>
          <Button onClick={onSync} loading={isSyncing} disabled={isSyncing}>
            {hasNoChanges ? t('OPENAPI_SYNC.RESTORE_SPEC_FILE') : t('OPENAPI_SYNC.CONFIRM_AND_SYNC_COLLECTION')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmSyncModal;

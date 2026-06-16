import React from 'react';
import { IconExternalLink, IconPlus } from '@tabler/icons';
import Modal from 'components/Modal';
import StatusBadge from 'ui/StatusBadge';
import Button from 'ui/Button';
import { CATALOG, COMPAT_META } from './catalog';

const openExternal = (url) => {
  if (window?.ipcRenderer?.openExternal) {
    window.ipcRenderer.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

const CatalogModal = ({ onAdd, onClose }) => {
  return (
    <Modal
      title="Browse Chai Plugins"
      size="lg"
      handleCancel={onClose}
      hideFooter
    >
      <div className="plugins-catalog">
        <div className="catalog-grid">
          {CATALOG.map((plugin) => {
            const meta = COMPAT_META[plugin.compat];
            return (
              <div className="catalog-card" key={plugin.name}>
                <div className="card-head">
                  <div className="card-name">{plugin.name}</div>
                  <StatusBadge status={meta.status} variant="light" size="xs">
                    {meta.label}
                  </StatusBadge>
                </div>
                <p className="card-desc">{plugin.description}</p>
                <div className="card-actions">
                  <Button
                    type="button"
                    size="sm"
                    color="primary"
                    icon={<IconPlus size={14} strokeWidth={2} />}
                    onClick={() => onAdd(plugin)}
                    data-testid={`catalog-add-${plugin.name}`}
                  >
                    Add to collection
                  </Button>
                  <button
                    type="button"
                    className="card-docs"
                    onClick={() => openExternal(plugin.docsUrl)}
                  >
                    Docs
                    <IconExternalLink size={12} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="catalog-footnote">
          Pure-JS plugins work in any sandbox. <strong>Developer mode only</strong> plugins need
          developer mode enabled (Preferences → Beta → JavaScript sandbox).
        </div>
      </div>
    </Modal>
  );
};

export default CatalogModal;

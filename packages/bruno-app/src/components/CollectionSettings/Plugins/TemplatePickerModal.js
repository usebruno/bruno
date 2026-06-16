import React, { useState } from 'react';
import { IconPlus } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';
import { TEMPLATES } from './templates';

const TemplatePickerModal = ({ onInsert, onClose }) => {
  const [selected, setSelected] = useState(TEMPLATES[0]?.name);
  const active = TEMPLATES.find((t) => t.name === selected) || TEMPLATES[0];

  return (
    <Modal
      title="Insert plugin template"
      size="lg"
      handleCancel={onClose}
      hideFooter
    >
      <div className="plugins-templates">
        <div className="templates-list">
          {TEMPLATES.map((tpl) => (
            <button
              type="button"
              key={tpl.name}
              className={`template-item ${tpl.name === selected ? 'active' : ''}`}
              onClick={() => setSelected(tpl.name)}
            >
              <div className="template-name">{tpl.name}</div>
              <div className="template-desc">{tpl.description}</div>
            </button>
          ))}
        </div>
        <div className="templates-preview">
          <pre className="template-snippet">{active?.snippet}</pre>
          <div className="template-actions">
            <Button
              type="button"
              size="sm"
              color="primary"
              icon={<IconPlus size={14} strokeWidth={2} />}
              onClick={() => {
                onInsert(active);
              }}
              data-testid="template-insert-btn"
            >
              Insert template
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default TemplatePickerModal;

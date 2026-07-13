import React, { useState, useEffect } from 'react';
import Portal from 'components/Portal/index';
import Modal from 'components/Modal';

const DocsLinkModal = ({ isOpen, onClose, onSubmit, initialText, initialUrl }) => {
  const [text, setText] = useState(initialText || '');
  const [url, setUrl] = useState(initialUrl || '');

  useEffect(() => {
    setText(initialText || '');
    setUrl(initialUrl || '');
  }, [initialText, initialUrl, isOpen]);

  const handleConfirm = () => {
    if (!url) return;
    onSubmit({ text, url });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Portal>
      <div data-testid="docs-link-modal">
        <Modal
          size="sm"
          title="Insert Link"
          confirmText="Insert"
          handleConfirm={handleConfirm}
          handleCancel={onClose}
          disableEscapeKey={false}
        >
          <div className="flex flex-col gap-4 bruno-form">
            <div>
              <label className="block font-semibold mb-2" htmlFor="linkText">Text</label>
              <input
                id="linkText"
                type="text"
                className="block textbox w-full"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Text to display"
              />
            </div>
            <div>
              <label className="block font-semibold mb-2" htmlFor="linkUrl">URL</label>
              <input
                id="linkUrl"
                type="text"
                className="block textbox w-full"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirm();
                  }
                }}
              />
            </div>
          </div>
        </Modal>
      </div>
    </Portal>
  );
};

export default DocsLinkModal;

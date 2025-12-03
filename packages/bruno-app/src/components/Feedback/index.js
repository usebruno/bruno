import React, { useState } from 'react';
import Modal from 'components/Modal/index';

const Feedback = ({ onClose }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handleSubmit = () => {
    if (title.trim() && body.trim()) {
      const url = `https://github.com/usebruno/bruno/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
      window.open(url, '_blank');
      onClose();
    }
  };

  return (
    <Modal
      size="md"
      title="Feedback"
      handleCancel={onClose}
      confirmText="Submit"
      handleConfirm={handleSubmit}
      confirmDisabled={!title.trim() || !body.trim()}
    >
      <div className="flex flex-col gap-4 bruno-form">
        <div>
          <label className="block select-none mb-2" htmlFor="feedback-title">
            Title
          </label>
          <input
            id="feedback-title"
            type="text"
            className="block textbox w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
          />
        </div>
        <div>
          <label className="block select-none mb-2" htmlFor="feedback-body">
            Description
          </label>
          <textarea
            id="feedback-body"
            className="block textbox w-full h-32 resize-none"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Describe the issue or feedback"
          />
        </div>
      </div>
    </Modal>
  );
};

export default Feedback;

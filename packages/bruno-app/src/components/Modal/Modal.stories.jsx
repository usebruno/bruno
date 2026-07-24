import React, { useState } from 'react';
import Modal from './index';
import Button from 'ui/Button';

export default {
  title: 'Components/Modal',
  component: Modal,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A centered modal dialog with a header, content area, and an optional '
          + 'Cancel/Confirm footer. Closes on the X, backdrop click, or Escape '
          + '(each configurable). Render it conditionally while it should be open.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Width preset of the modal card'
    },
    title: { control: 'text', description: 'Header title' },
    confirmText: { control: 'text', description: 'Confirm button label (default: Save)' },
    cancelText: { control: 'text', description: 'Cancel button label (default: Cancel)' },
    hideFooter: { control: 'boolean', description: 'Hide the footer entirely' },
    confirmDisabled: { control: 'boolean', description: 'Disable the confirm button' }
  }
};

export const Default = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: '1rem', minHeight: 400, position: 'relative' }}>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        {open && (
          <Modal {...args} handleCancel={() => setOpen(false)} handleConfirm={() => setOpen(false)}>
            <p>This is the modal body. Put any content here.</p>
          </Modal>
        )}
      </div>
    );
  },
  args: {
    size: 'md',
    title: 'Example Modal',
    confirmText: 'Save',
    cancelText: 'Cancel'
  }
};

export const WithoutFooter = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: '1rem', minHeight: 400, position: 'relative' }}>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        {open && (
          <Modal {...args} handleCancel={() => setOpen(false)}>
            <p>A modal with no footer — useful for informational dialogs.</p>
          </Modal>
        )}
      </div>
    );
  },
  args: {
    size: 'sm',
    title: 'Info',
    hideFooter: true
  }
};

export const DangerConfirm = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: '1rem', minHeight: 400, position: 'relative' }}>
        <Button color="danger" onClick={() => setOpen(true)}>Delete…</Button>
        {open && (
          <Modal {...args} handleCancel={() => setOpen(false)} handleConfirm={() => setOpen(false)}>
            <p>This action cannot be undone. Are you sure you want to delete this item?</p>
          </Modal>
        )}
      </div>
    );
  },
  args: {
    size: 'sm',
    title: 'Delete item',
    confirmText: 'Delete',
    confirmButtonColor: 'danger'
  }
};

export const ConfirmDisabled = {
  render: (args) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ padding: '1rem', minHeight: 400, position: 'relative' }}>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        {open && (
          <Modal {...args} handleCancel={() => setOpen(false)} handleConfirm={() => setOpen(false)}>
            <p>The confirm button is disabled until requirements are met.</p>
          </Modal>
        )}
      </div>
    );
  },
  args: {
    size: 'md',
    title: 'Confirm disabled',
    confirmDisabled: true
  }
};

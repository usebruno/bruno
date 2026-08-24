import React, { useState } from 'react';
import FileUploadField from './index';

export default {
  title: 'Components/FileUploadField',
  component: FileUploadField,
  args: {
    id: 'caCert',
    onChange: () => {}
  },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A single-file picker that reads as a text field: a bordered box showing either the '
          + 'placeholder or the chosen file\'s name, with a clear button once something is picked. '
          + 'Clicking anywhere in the box opens the native dialog.\n\n'
          + 'It is controlled, and `value` is an absolute **path string** rather than a `File` — '
          + 'every call site persists a path, so the File object is a detail of picking. '
          + '`onChange` receives the new path, or `null` when cleared.\n\n'
          + 'It renders no label, hint or error text: wrap it in a field component (e.g. '
          + 'Preferences\' `SettingsField`) which owns those. `invalid` only styles the box, so the '
          + 'message stays with the wrapper that owns the rest of the copy.\n\n'
          + 'Picking goes through Electron (`ipcRenderer.getFilePath`), so the native dialog does '
          + 'nothing in Storybook — the stories below seed a value to show the selected state.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'Absolute path of the selected file; empty shows the placeholder'
    },
    placeholder: {
      control: 'text',
      description: 'Shown in place of a filename while nothing is selected'
    },
    accept: {
      control: 'text',
      description:
        'File types the native dialog should offer (e.g. `.proto`). Leave unset where the '
        + 'extension is not a reliable signal — CA bundles arrive as .pem, .cer, .der, .ca-bundle '
        + 'or with no extension at all'
    },
    invalid: {
      control: 'boolean',
      description: 'Styles the box as failed validation (danger border + alert icon). The message itself belongs to the wrapping field'
    },
    clearLabel: {
      control: 'text',
      description: 'Accessible label of the clear button shown once a file is selected'
    },
    disabled: {
      control: 'boolean',
      description: 'Disables both picking and clearing'
    }
  }
};

export const Default = {
  render: (args) => {
    const [value, setValue] = useState(null);
    return <FileUploadField id="caCert" {...args} value={value} onChange={setValue} />;
  }
};

export const WithSelectedFile = {
  tags: ['!dev'],
  args: {
    value: '/home/jane/certs/ca.pem',
    placeholder: 'No certificate selected'
  }
};

export const LongFileName = {
  tags: ['!dev'],
  args: {
    value: '/home/jane/certs/corporate-root-certificate-authority-bundle-2026.pem'
  }
};

export const Invalid = {
  tags: ['!dev'],
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
      <FileUploadField {...args} value="/home/jane/certs/keystore.p12" invalid />
      <small>Not a PEM certificate — expected .pem or .crt</small>
    </div>
  )
};

export const CustomPlaceholder = {
  tags: ['!dev'],
  args: {
    placeholder: 'No certificate selected',
    clearLabel: 'Remove custom CA certificate'
  }
};

export const Disabled = {
  tags: ['!dev'],
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      <FileUploadField id="caCertEmpty" placeholder="No certificate selected" disabled onChange={() => {}} />
      <FileUploadField id="caCertFilled" value="/home/jane/certs/ca.pem" disabled onChange={() => {}} />
    </div>
  )
};

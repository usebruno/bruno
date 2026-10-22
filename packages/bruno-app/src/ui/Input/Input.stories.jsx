import React, { useState } from 'react';
import { IconSearch, IconX } from '@tabler/icons';
import Input from './index';
import Field from '../Field';

export default {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      source: {
        transform: (code) => code.replace(/\bPlayground\b/g, 'Input')
      },
      description: {
        component:
          'A single-line text input. Supports labels, descriptions, validation, icons, and multiple sizes. Use the ghost variant for borderless inputs in table cells.'
      }
    }
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['default', 'ghost'],
      description: 'Use ghost for borderless inputs in table cells.'
    },
    size: {
      control: 'inline-radio',
      options: ['xs', 'sm', 'md', 'lg'],
      description: 'xs (24px), sm (28px), md (34px, default), lg (40px).'
    },
    type: {
      control: 'text',
      description: 'Native HTML input type.'
    },
    error: {
      control: 'boolean',
      description: 'Shows the error state and sets aria-invalid.'
    },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    leftSection: {
      control: false,
      description: 'Content displayed before the input text.'
    },
    rightSection: {
      control: false,
      description: 'Content displayed after the input text.'
    },
    onChange: {
      action: 'changed',
      description: 'Receives the native input event.'
    }
  }
};

const columnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  maxWidth: '320px'
};

const Playground = ({ value: initialValue = '', onChange, ...props }) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = (event) => {
    setValue(event.target.value);
    onChange?.(event);
  };

  return <Input {...props} value={value} onChange={handleChange} />;
};

export const Default = {
  args: {
    placeholder: 'Placeholder',
    fullWidth: true
  },
  render: (args) => <Playground {...args} />
};

export const Sizes = {
  tags: ['!dev'],
  render: () => (
    <div style={columnStyle}>
      {[
        ['xs', 'Extra small'],
        ['sm', 'Small'],
        ['md', 'Medium (default)'],
        ['lg', 'Large']
      ].map(([size, placeholder]) => (
        <Input
          key={size}
          size={size}
          fullWidth
          placeholder={placeholder}
          value=""
          onChange={() => {}}
        />
      ))}
    </div>
  )
};

export const States = {
  tags: ['!dev'],
  render: () => (
    <div style={columnStyle}>
      <Field label="Label" description="Helper text">
        <Input
          fullWidth
          placeholder="Placeholder"
          rightSection={<IconX />}
          value=""
          onChange={() => {}}
        />
      </Field>

      <Field label="Label" description="Helper text">
        <Input fullWidth placeholder="Placeholder" value="" onChange={() => {}} />
      </Field>

      <Field label="Label" description="Helper text">
        <Input fullWidth autoFocus value="Focused" onChange={() => {}} />
      </Field>

      <Field label="Label" description="Helper text">
        <Input fullWidth value="Filled" onChange={() => {}} />
      </Field>

      <Field label="Label" error="Helper text">
        <Input fullWidth value="Invalid" onChange={() => {}} />
      </Field>

      <Field label="Label" description="Helper text">
        <Input fullWidth disabled placeholder="Placeholder" value="" onChange={() => {}} />
      </Field>
    </div>
  )
};

const FieldExample = () => {
  const [name, setName] = useState('');

  return (
    <div style={columnStyle}>
      <Input
        label="Collection name"
        description="Used as the folder name on disk"
        required
        fullWidth
        placeholder="e.g. orders-api"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />

      <Input
        label="Collection name"
        error="Collection name is required"
        fullWidth
        value=""
        onChange={() => {}}
      />
    </div>
  );
};

export const WithField = {
  tags: ['!dev'],
  parameters: {
    docs: {
      source: {
        code: `<Input
  label="Collection name"
  description="Used as the folder name on disk"
  required
  fullWidth
  value={name}
  onChange={(event) => setName(event.target.value)}
/>`
      }
    }
  },
  render: () => <FieldExample />
};

export const Sections = {
  tags: ['!dev'],
  render: () => (
    <div style={columnStyle}>
      <Input
        fullWidth
        placeholder="Search"
        leftSection={<IconSearch />}
        value=""
        onChange={() => {}}
      />

      <Input
        fullWidth
        value="1500"
        rightSection={<span>ms</span>}
        onChange={() => {}}
      />
    </div>
  )
};

export const Ghost = {
  tags: ['!dev'],
  render: () => (
    <div style={{ ...columnStyle, maxWidth: '420px' }}>
      <Input
        variant="ghost"
        fullWidth
        placeholder="Key"
        value="Content-Type"
        onChange={() => {}}
      />

      <Input
        variant="ghost"
        fullWidth
        placeholder="Value"
        value=""
        onChange={() => {}}
      />
    </div>
  )
};

const PortExample = () => {
  const [port, setPort] = useState('8080');

  return (
    <Field label="Port" description="Native spinners are hidden by default">
      <Input
        type="number"
        min={1}
        max={65535}
        value={port}
        onChange={(event) => setPort(event.target.value)}
      />
    </Field>
  );
};

export const NumberInput = {
  tags: ['!dev'],
  parameters: {
    docs: {
      source: {
        code: `<Field label="Port">
  <Input
    type="number"
    min={1}
    max={65535}
    value={port}
    onChange={(event) => setPort(event.target.value)}
  />
</Field>`
      }
    }
  },
  render: () => <PortExample />
};

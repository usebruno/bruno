import React, { useState } from 'react';
import { IconSearch, IconX } from '@tabler/icons';
import Input from './index';
import Field from '../Field';

export default {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'padded',
    docs: {
      source: { transform: (code) => code.replace(/\bPlayground\b/g, 'Input') },
      description: {
        component:
          'A single-line text entry control. Controlled: pass value and onChange. Pass label, description, error or required for a labelled form field (it wraps itself in Field), or use it bare inside a table cell. Wrap other controls in Field directly. Sizes: xs (~22px, compact), sm (~27px), md (~33px, the default — lines up with Select in forms). Use variant="ghost" for a borderless cell input (ghost ignores size).'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['default', 'ghost'],
      description: 'ghost is borderless, for table cells that sit beside SingleLineEditor cells.'
    },
    size: {
      control: 'inline-radio',
      options: ['xs', 'sm', 'md'],
      description: 'xs ~22px, sm ~27px, md ~33px (default). Same scale as Select.'
    },
    type: { control: 'text', description: 'Passed through to the input element.' },
    error: { control: 'boolean', description: 'Draws the danger border and sets aria-invalid.' },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    leftSection: { control: false, description: 'Leading content — an icon or a short prefix.' },
    rightSection: { control: false, description: 'Trailing content — a unit, an action.' },
    onChange: {
      action: 'changed',
      description:
        'Receives the native DOM event, not the value — read e.target.value. This is what lets {...formik.getFieldProps(name)} work: formik reads name and value off the event.'
    }
  }
};

const Playground = ({ value: initial = '', onChange, ...args }) => {
  const [value, setValue] = useState(initial);
  return (
    <Input
      {...args}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        onChange?.(e);
      }}
    />
  );
};

export const Default = {
  args: { placeholder: 'Placeholder', fullWidth: true },
  render: (args) => <Playground {...args} />
};

const column = { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '320px' };

/** xs ~22px, sm ~27px, md ~33px (default, the form height used by Select). */
export const Sizes = {
  tags: ['!dev'],
  render: () => (
    <div style={column}>
      <Input size="xs" fullWidth placeholder="Extra small" value="" onChange={() => {}} />
      <Input size="sm" fullWidth placeholder="Small" value="" onChange={() => {}} />
      <Input size="md" fullWidth placeholder="Medium (default)" value="" onChange={() => {}} />
    </div>
  )
};

/** Every state from the design, top to bottom. */
export const States = {
  tags: ['!dev'],
  render: () => (
    <div style={column}>
      <Field label="Label" description="Helper text">
        <Input fullWidth placeholder="Placeholder" rightSection={<IconX />} value="" onChange={() => {}} />
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
    <div style={column}>
      <Input
        label="Collection name"
        description="Used as the folder name on disk"
        required
        fullWidth
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. orders-api"
      />
      <Input label="Collection name" error="Collection name is required" fullWidth value="" onChange={() => {}} />
    </div>
  );
};

/** Label, description and error are Input props; the error replaces the description. */
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
                  onChange={(e) => setName(e.target.value)}
                />`
      }
    }
  },
  render: () => <FieldExample />
};

export const Sections = {
  tags: ['!dev'],
  render: () => (
    <div style={column}>
      <Input fullWidth placeholder="Search" leftSection={<IconSearch />} value="" onChange={() => {}} />
      <Input fullWidth value="1500" onChange={() => {}} rightSection={<span>ms</span>} />
    </div>
  )
};

/** Borderless, for table cells. Placeholder colours come from the CodeMirror tokens so
 *  a ghost input is indistinguishable from a SingleLineEditor cell next to it. */
export const Ghost = {
  tags: ['!dev'],
  render: () => (
    <div style={{ ...column, maxWidth: '420px' }}>
      <Input variant="ghost" fullWidth placeholder="Key" value="Content-Type" onChange={() => {}} />
      <Input variant="ghost" fullWidth placeholder="Value" value="" onChange={() => {}} />
    </div>
  )
};

const PortExample = () => {
  const [port, setPort] = useState('8080');
  return (
    <Field label="Port" description="Native spinners are hidden by default">
      <Input type="number" min={1} max={65535} value={port} onChange={(e) => setPort(e.target.value)} />
    </Field>
  );
};

export const NumberInput = {
  tags: ['!dev'],
  parameters: {
    docs: {
      source: {
        code: `<Field label="Port">
          <Input type="number" min={1} max={65535} value={port} onChange={(e) => setPort(e.target.value)} />
        </Field>`
      }
    }
  },
  render: () => <PortExample />
};

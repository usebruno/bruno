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
      description: {
        component:
          'A single-line text entry control. Controlled: pass value and onChange. Wrap it in Field for a label, helper text and error wiring, or use it bare inside a table cell. There is deliberately no size prop — the design specifies one height; use variant="ghost" for a borderless cell input.'
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
    type: { control: 'text', description: 'Passed through to the input element.' },
    error: { control: 'boolean', description: 'Draws the danger border and sets aria-invalid.' },
    withVisibilityToggle: {
      control: 'boolean',
      description: 'Adds a reveal button. Only applies when type is "password".'
    },
    fullWidth: { control: 'boolean' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    leftSection: { control: false, description: 'Leading content — an icon or a short prefix.' },
    rightSection: { control: false, description: 'Trailing content — a unit, an action.' },
    onChange: { action: 'changed' }
  }
};

// Controlled wrapper so the playground args actually type.
const Playground = ({ value: initial = '', ...args }) => {
  const [value, setValue] = useState(initial);
  return <Input {...args} value={value} onChange={(e) => setValue(e.target.value)} />;
};

export const Default = {
  args: { placeholder: 'Placeholder', fullWidth: true },
  render: (args) => <Playground {...args} />
};

const column = { display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '320px' };

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
      <Field label="Collection name" description="Used as the folder name on disk" required>
        <Input fullWidth value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. orders-api" />
      </Field>
      <Field label="Collection name" error="Collection name is required">
        <Input fullWidth value="" onChange={() => {}} />
      </Field>
    </div>
  );
};

/** Field owns the label and the single helper slot; the error replaces the description. */
export const WithField = {
  tags: ['!dev'],
  render: () => <FieldExample />
};

export const Sections = {
  tags: ['!dev'],
  render: () => (
    <div style={column}>
      <Input fullWidth placeholder="Search" leftSection={<IconSearch />} value="" onChange={() => {}} />
      <Input fullWidth value="1500" onChange={() => {}} rightSection={<span>ms</span>} />
      <Input fullWidth type="password" withVisibilityToggle value="s3cret" onChange={() => {}} />
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
  render: () => <PortExample />
};

import React, { useState } from 'react';
import Checkbox from './index';

export default {
  title: 'Components/Checkbox',
  component: Checkbox,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'The size of the checkbox'
    },
    checked: {
      control: 'boolean',
      description: 'Whether the checkbox is checked'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the checkbox is disabled'
    },
    label: {
      control: 'text',
      description: 'Optional label rendered next to the checkbox'
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name when there is no visible label (e.g. icon-only checkboxes)'
    },
    ariaLabelledBy: {
      control: 'text',
      description: 'ID of an external element to use as the accessible name, instead of ariaLabel'
    },
    onChange: { action: 'changed' }
  }
};

const Controlled = (args) => {
  const [checked, setChecked] = useState(!!args.checked);
  return <Checkbox {...args} checked={checked} onChange={(e) => setChecked(e.target.checked)} />;
};

export const Default = {
  render: (args) => <Controlled {...args} />,
  args: {
    label: 'Accept terms and conditions'
  }
};

export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <Checkbox size="sm" checked label="Small" onChange={() => {}} />
      <Checkbox size="md" checked label="Medium" onChange={() => {}} />
      <Checkbox size="lg" checked label="Large" onChange={() => {}} />
      <Checkbox size="xl" checked label="Extra Large" onChange={() => {}} />
    </div>
  )
};

export const States = {
  tags: ['!dev'],
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <Checkbox label="Unchecked" checked={false} onChange={() => {}} />
      <Checkbox label="Checked" checked onChange={() => {}} />
      <Checkbox label="Disabled unchecked" checked={false} disabled onChange={() => {}} />
      <Checkbox label="Disabled checked" checked disabled onChange={() => {}} />
    </div>
  )
};

export const WithoutLabel = {
  tags: ['!dev'],
  args: {
    checked: true
  },
  render: (args) => <Controlled {...args} />
};

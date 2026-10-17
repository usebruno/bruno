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
    indeterminate: {
      control: 'boolean',
      description: 'Tri-state "some, not all" visual, e.g. for a "select all" checkbox. Does not affect `checked`.'
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
  tags: ['!dev'],
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

export const Indeterminate = {
  tags: ['!dev'],
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
      <Checkbox size="sm" indeterminate label="Small" onChange={() => {}} />
      <Checkbox size="md" indeterminate label="Medium" onChange={() => {}} />
      <Checkbox size="lg" indeterminate label="Large" onChange={() => {}} />
      <Checkbox size="xl" indeterminate label="Extra Large" onChange={() => {}} />
    </div>
  )
};

const SelectAllDemo = ({ size, disabled, label = 'Select all' }) => {
  const [items, setItems] = useState([
    { id: 1, label: 'Item 1', selected: true },
    { id: 2, label: 'Item 2', selected: false },
    { id: 3, label: 'Item 3', selected: false }
  ]);

  const selectedCount = items.filter((item) => item.selected).length;
  const allSelected = selectedCount === items.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleAll = (e) => {
    const next = e.target.checked;
    setItems(items.map((item) => ({ ...item, selected: next })));
  };

  const toggleOne = (id) => {
    setItems(items.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Checkbox
        size={size}
        disabled={disabled}
        label={label}
        checked={allSelected}
        indeterminate={someSelected}
        onChange={toggleAll}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '20px' }}>
        {items.map((item) => (
          <Checkbox
            key={item.id}
            size={size}
            disabled={disabled}
            label={item.label}
            checked={item.selected}
            onChange={() => toggleOne(item.id)}
          />
        ))}
      </div>
    </div>
  );
};

export const SelectAll = {
  args: {
    size: 'md',
    disabled: false,
    label: 'Select all'
  },
  render: (args) => <SelectAllDemo {...args} />
};

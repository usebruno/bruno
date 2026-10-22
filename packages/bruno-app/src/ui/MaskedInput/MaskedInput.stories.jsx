import React, { useState } from 'react';
import MaskedInput from './index';

export default {
  title: 'Components/MaskedInput',
  component: MaskedInput,
  parameters: {
    layout: 'padded',
    docs: {
      source: { transform: (code) => code.replace(/\bPlayground\b/g, 'MaskedInput') },
      description: {
        component:
          'An Input for passwords, tokens and API keys, with a show/hide toggle. It takes every Input prop (label, description, error, size, leftSection) and ignores type. Visibility is managed internally unless controlled with visible and onVisibilityChange. Autocomplete, autocorrect and autocapitalize are off by default. For multi-line secrets such as PEM keys, use MaskedTextfield.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg'] },
    visible: { control: 'boolean', description: 'Controlled visibility. Leave unset for internal state.' },
    onVisibilityChange: { action: 'visibility changed', description: 'Called with the next visibility.' },
    error: { control: 'text', description: 'A string shows the message below the input; any other truthy value only draws the danger border.' },
    disabled: { control: 'boolean', description: 'Also hides the toggle.' },
    fullWidth: { control: 'boolean' },
    onChange: { action: 'changed' }
  }
};

const Playground = ({ value: initial = '', onChange, ...args }) => {
  const [value, setValue] = useState(initial);
  return (
    <MaskedInput
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
  args: { placeholder: 'API key', fullWidth: true },
  render: (args) => <Playground {...args} />
};

export const WithLabelAndDescription = {
  args: {
    label: 'Access token',
    description: 'Stored encrypted on this device.',
    value: 'sk-1234567890',
    fullWidth: true
  },
  render: (args) => <Playground {...args} />
};

export const WithError = {
  args: { label: 'Access token', error: 'Token is required', fullWidth: true },
  render: (args) => <Playground {...args} />
};

export const Disabled = {
  args: { label: 'Access token', value: 'sk-1234567890', disabled: true, fullWidth: true },
  render: (args) => <Playground {...args} />
};

const ControlledExample = () => {
  const [visible, setVisible] = useState(true);
  return (
    <Playground
      label="Access token"
      value="sk-1234567890"
      visible={visible}
      onVisibilityChange={setVisible}
      fullWidth
    />
  );
};

export const ControlledVisibility = {
  render: () => <ControlledExample />
};

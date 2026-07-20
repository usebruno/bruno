import React, { useState } from 'react';
import RadioGroup, { Radio } from './index';

export default {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  subcomponents: { Radio },
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'],
      description: 'Layout direction of the options'
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md'],
      description: 'Size of the radio controls and labels'
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the whole group'
    },
    label: {
      control: 'text',
      description: 'Optional group label'
    }
  }
};

const Controlled = ({ initial = 'manual', children, ...props }) => {
  const [value, setValue] = useState(initial);
  return (
    <RadioGroup value={value} onChange={setValue} name={props.name || 'demo'} {...props}>
      {children}
    </RadioGroup>
  );
};

export const Default = {
  render: (args) => (
    <Controlled {...args}>
      <Radio value="off" label="Off" />
      <Radio value="manual" label="Manual" />
      <Radio value="system" label="System Proxy" />
    </Controlled>
  ),
  args: {
    label: 'Proxy mode',
    orientation: 'vertical',
    size: 'md'
  }
};

export const Horizontal = {
  render: (args) => (
    <Controlled {...args} name="horizontal">
      <Radio value="off" label="Off" />
      <Radio value="manual" label="Manual" />
      <Radio value="system" label="System Proxy" />
    </Controlled>
  ),
  args: {
    label: 'Proxy mode',
    orientation: 'horizontal'
  }
};

export const WithDescriptions = {
  render: (args) => (
    <Controlled {...args} name="descriptions" initial="developer">
      <Radio value="safe" label="Safe mode" description="Scripts run in a restricted sandbox." />
      <Radio value="developer" label="Developer mode" description="Full access to Node APIs in scripts." />
    </Controlled>
  ),
  args: {
    label: 'JS sandbox'
  }
};

export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', gap: '48px' }}>
      <Controlled name="size-sm" size="sm" label="Small">
        <Radio value="off" label="Off" />
        <Radio value="manual" label="Manual" />
      </Controlled>
      <Controlled name="size-md" size="md" label="Medium">
        <Radio value="off" label="Off" />
        <Radio value="manual" label="Manual" />
      </Controlled>
    </div>
  )
};

export const DisabledGroup = {
  render: (args) => (
    <Controlled {...args} name="disabled-group" disabled>
      <Radio value="off" label="Off" />
      <Radio value="manual" label="Manual" />
      <Radio value="system" label="System Proxy" />
    </Controlled>
  ),
  args: {
    label: 'Proxy mode (disabled)'
  }
};

export const DisabledOption = {
  render: (args) => (
    <Controlled {...args} name="disabled-option">
      <Radio value="off" label="Off" />
      <Radio value="manual" label="Manual" />
      <Radio value="system" label="System Proxy (unavailable)" disabled />
    </Controlled>
  ),
  args: {
    label: 'Proxy mode'
  }
};

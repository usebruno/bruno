import React, { useState } from 'react';
import RadioGroup, { Radio } from './index';

export default {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  subcomponents: { Radio },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Groups a set of `Radio` options under a single controlled value. '
          + 'Supports vertical/horizontal layouts and two sizes, and always exposes '
          + 'an accessible name via `label`, `ariaLabel`, or `ariaLabelledBy`. '
          + 'See the props table below for the full API.'
      }
    }
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
      description: 'Optional visible group label (also names the group for a11y)'
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name when no visible label is rendered'
    },
    ariaLabelledBy: {
      control: 'text',
      description: 'Id of an external element that labels the group'
    }
  }
};

// No `name` is passed — RadioGroup auto-generates a unique one per instance so
// stories don't collide as one native radio group on the inline Docs page.
const Controlled = ({ initial = 'manual', children, ...props }) => {
  const [value, setValue] = useState(initial);
  return (
    <RadioGroup value={value} onChange={setValue} {...props}>
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
    <Controlled {...args}>
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
    <Controlled {...args} initial="developer">
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
      <Controlled size="sm" label="Small">
        <Radio value="off" label="Off" />
        <Radio value="manual" label="Manual" />
      </Controlled>
      <Controlled size="md" label="Medium">
        <Radio value="off" label="Off" />
        <Radio value="manual" label="Manual" />
      </Controlled>
    </div>
  )
};

export const DisabledGroup = {
  render: (args) => (
    <Controlled {...args} disabled>
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
    <Controlled {...args}>
      <Radio value="off" label="Off" />
      <Radio value="manual" label="Manual" />
      <Radio value="system" label="System Proxy (unavailable)" disabled />
    </Controlled>
  ),
  args: {
    label: 'Proxy mode'
  }
};

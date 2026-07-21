import React, { useState } from 'react';
import RadioGroup from './index';

export default {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A controlled radio group. Pass the options via `items`. Supports '
          + 'vertical/horizontal layouts and two sizes, and always exposes an '
          + 'accessible name via `label`, `ariaLabel`, or `ariaLabelledBy`. '
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

const proxyModes = [
  { value: 'off', label: 'Off' },
  { value: 'manual', label: 'Manual' },
  { value: 'system', label: 'System Proxy' }
];

// State is inlined in each render (not a wrapper component) so the code panel
// shows <RadioGroup>. No `name` is passed — RadioGroup auto-generates a unique
// one per instance, so stories don't collide as one native radio group on the
// inline Docs page.

export const Default = {
  render: (args) => {
    const [value, setValue] = useState('manual');
    return <RadioGroup {...args} value={value} onChange={setValue} items={proxyModes} />;
  },
  args: {
    label: 'Proxy mode',
    orientation: 'vertical',
    size: 'md'
  }
};

export const Horizontal = {
  render: (args) => {
    const [value, setValue] = useState('manual');
    return <RadioGroup {...args} value={value} onChange={setValue} items={proxyModes} />;
  },
  args: {
    label: 'Proxy mode',
    orientation: 'horizontal'
  }
};

export const WithDescriptions = {
  render: (args) => {
    const [value, setValue] = useState('developer');
    return (
      <RadioGroup
        {...args}
        value={value}
        onChange={setValue}
        items={[
          { value: 'safe', label: 'Safe mode', description: 'Scripts run in a restricted sandbox.' },
          { value: 'developer', label: 'Developer mode', description: 'Full access to Node APIs in scripts.' }
        ]}
      />
    );
  },
  args: {
    label: 'JS sandbox'
  }
};

export const Sizes = {
  render: () => {
    const [value, setValue] = useState('manual');
    const items = [
      { value: 'off', label: 'Off' },
      { value: 'manual', label: 'Manual' }
    ];
    return (
      <div style={{ display: 'flex', gap: '48px' }}>
        <RadioGroup size="sm" label="Small" value={value} onChange={setValue} items={items} />
        <RadioGroup size="md" label="Medium" value={value} onChange={setValue} items={items} />
      </div>
    );
  }
};

export const DisabledGroup = {
  render: (args) => {
    const [value, setValue] = useState('manual');
    return <RadioGroup {...args} disabled value={value} onChange={setValue} items={proxyModes} />;
  },
  args: {
    label: 'Proxy mode (disabled)'
  }
};

export const DisabledOption = {
  render: (args) => {
    const [value, setValue] = useState('manual');
    return (
      <RadioGroup
        {...args}
        value={value}
        onChange={setValue}
        items={[
          { value: 'off', label: 'Off' },
          { value: 'manual', label: 'Manual' },
          { value: 'system', label: 'System Proxy (unavailable)', disabled: true }
        ]}
      />
    );
  },
  args: {
    label: 'Proxy mode'
  }
};

import React, { useState } from 'react';
import { IconWorld, IconBolt, IconCirclesRelation, IconWifi } from '@tabler/icons';
import SegmentedControl from './index';

export default {
  title: 'Components/SegmentedControl',
  component: SegmentedControl,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A segmented control for choosing one option from a small set. '
          + 'Pass the options via `items`. Single-select with radiogroup semantics '
          + '(arrow-key navigation, screen-reader friendly). Supports sizes, '
          + 'full-width, per-item icons, and disabled state. See the props table below.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the segments'
    },
    variant: {
      control: 'inline-radio',
      options: ['solid', 'outlined'],
      description: 'Visual style: solid recessed track (default) or outlined container'
    },
    fullWidth: {
      control: 'boolean',
      description: 'Stretch the control to fill its container (equal-width segments)'
    },
    disabled: {
      control: 'boolean',
      description: 'Disable the whole control'
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name for the group'
    }
  }
};

const requestTypes = [
  { value: 'http', label: 'HTTP' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'grpc', label: 'gRPC' },
  { value: 'ws', label: 'WebSocket', disabled: true }
];

export const Default = {
  render: (args) => {
    const [value, setValue] = useState('http');
    return (
      <SegmentedControl ariaLabel="Request type" {...args} value={value} onChange={setValue} items={requestTypes} />
    );
  }
};

// The stories below only appear on the Docs page (as additional examples), not
// as their own entries in the sidebar/toolbar, see the `!dev` tag.

export const Outlined = {
  tags: ['!dev'],
  render: (args) => {
    const [value, setValue] = useState('http');
    return (
      <SegmentedControl ariaLabel="Request type" {...args} variant="outlined" value={value} onChange={setValue} items={requestTypes} />
    );
  }
};

export const FullWidth = {
  tags: ['!dev'],
  render: (args) => {
    const [value, setValue] = useState('http');
    return (
      <div style={{ width: 480 }}>
        <SegmentedControl ariaLabel="Request type" {...args} fullWidth value={value} onChange={setValue} items={requestTypes} />
      </div>
    );
  }
};

export const Sizes = {
  tags: ['!dev'],
  render: () => {
    const [value, setValue] = useState('http');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
        <SegmentedControl ariaLabel="Small" size="sm" value={value} onChange={setValue} items={requestTypes} />
        <SegmentedControl ariaLabel="Medium" size="md" value={value} onChange={setValue} items={requestTypes} />
        <SegmentedControl ariaLabel="Large" size="lg" value={value} onChange={setValue} items={requestTypes} />
      </div>
    );
  }
};

export const WithIcons = {
  tags: ['!dev'],
  render: (args) => {
    const [value, setValue] = useState('http');
    return (
      <SegmentedControl
        ariaLabel="Request type"
        {...args}
        value={value}
        onChange={setValue}
        items={[
          { value: 'http', label: 'HTTP', icon: <IconWorld size={15} strokeWidth={1.5} /> },
          { value: 'graphql', label: 'GraphQL', icon: <IconBolt size={15} strokeWidth={1.5} /> },
          { value: 'grpc', label: 'gRPC', icon: <IconCirclesRelation size={15} strokeWidth={1.5} /> },
          { value: 'ws', label: 'WebSocket', icon: <IconWifi size={15} strokeWidth={1.5} /> }
        ]}
      />
    );
  }
};

export const DisabledOption = {
  tags: ['!dev'],
  render: (args) => {
    const [value, setValue] = useState('http');
    return (
      <SegmentedControl
        ariaLabel="Request type"
        {...args}
        value={value}
        onChange={setValue}
        items={[
          { value: 'http', label: 'HTTP' },
          { value: 'graphql', label: 'GraphQL' },
          { value: 'grpc', label: 'gRPC', disabled: true },
          { value: 'ws', label: 'WebSocket' }
        ]}
      />
    );
  }
};

export const DisabledGroup = {
  tags: ['!dev'],
  render: (args) => {
    const [value, setValue] = useState('http');
    return (
      <SegmentedControl ariaLabel="Request type" {...args} disabled value={value} onChange={setValue} items={requestTypes} />
    );
  }
};

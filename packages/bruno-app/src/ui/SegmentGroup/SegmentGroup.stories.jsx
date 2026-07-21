import React, { useState } from 'react';
import { IconWorld, IconApi, IconServer, IconPlugConnected } from '@tabler/icons';
import SegmentGroup, { Segment } from './index';

export default {
  title: 'Components/SegmentGroup',
  component: SegmentGroup,
  subcomponents: { Segment },
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A segmented control for choosing one option from a small set. '
          + 'Single-select with radiogroup semantics (arrow-key navigation, '
          + 'screen-reader friendly). Supports sizes, full-width, per-segment '
          + 'icons, and disabled state. See the props table below for the full API.'
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

const Controlled = ({ initial = 'http', children, ...props }) => {
  const [value, setValue] = useState(initial);
  return (
    <SegmentGroup value={value} onChange={setValue} ariaLabel="Request type" {...props}>
      {children}
    </SegmentGroup>
  );
};

const RequestTypes = () => (
  <>
    <Segment value="http" label="HTTP" />
    <Segment value="graphql" label="GraphQL" />
    <Segment value="grpc" label="gRPC" />
    <Segment value="ws" label="WebSocket" />
  </>
);

export const Default = {
  render: (args) => (
    <Controlled {...args}>
      <RequestTypes />
    </Controlled>
  )
};

export const FullWidth = {
  render: (args) => (
    <div style={{ width: 480 }}>
      <Controlled {...args} fullWidth>
        <RequestTypes />
      </Controlled>
    </div>
  )
};

export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      <Controlled size="sm">
        <RequestTypes />
      </Controlled>
      <Controlled size="md">
        <RequestTypes />
      </Controlled>
      <Controlled size="lg">
        <RequestTypes />
      </Controlled>
    </div>
  )
};

export const WithIcons = {
  render: (args) => (
    <Controlled {...args}>
      <Segment value="http" label="HTTP" icon={<IconWorld size={15} strokeWidth={1.5} />} />
      <Segment value="graphql" label="GraphQL" icon={<IconApi size={15} strokeWidth={1.5} />} />
      <Segment value="grpc" label="gRPC" icon={<IconServer size={15} strokeWidth={1.5} />} />
      <Segment value="ws" label="WebSocket" icon={<IconPlugConnected size={15} strokeWidth={1.5} />} />
    </Controlled>
  )
};

export const DisabledOption = {
  render: (args) => (
    <Controlled {...args}>
      <Segment value="http" label="HTTP" />
      <Segment value="graphql" label="GraphQL" />
      <Segment value="grpc" label="gRPC" disabled />
      <Segment value="ws" label="WebSocket" />
    </Controlled>
  )
};

export const DisabledGroup = {
  render: (args) => (
    <Controlled {...args} disabled>
      <RequestTypes />
    </Controlled>
  )
};

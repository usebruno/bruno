import React from 'react';
import StatusBadge from './index';

export default {
  title: 'Components/StatusBadge',
  component: StatusBadge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A small themed status badge. Supports status colors '
          + '(success/info/warning/danger/muted), light/filled/outline/ghost variants, '
          + 'sizes, and optional left/right sections.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['danger', 'warning', 'info', 'success', 'muted'],
      description: 'Theme status key'
    },
    variant: {
      control: 'select',
      options: ['light', 'filled', 'outline', 'ghost'],
      description: 'Visual style'
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md'],
      description: 'Size preset'
    },
    radius: {
      control: 'text',
      description: 'Theme radius key (\'sm\',\'base\',\'md\',\'lg\',\'xl\') or CSS value'
    },
    children: {
      control: 'text',
      description: 'Badge text content'
    }
  }
};

export const Default = {
  args: {
    children: 'Draft'
  }
};

export const Statuses = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <StatusBadge status="success">Success</StatusBadge>
      <StatusBadge status="info">Info</StatusBadge>
      <StatusBadge status="warning">Warning</StatusBadge>
      <StatusBadge status="danger">Error</StatusBadge>
      <StatusBadge status="muted">Muted</StatusBadge>
    </div>
  )
};

export const Variants = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {['light', 'filled', 'outline', 'ghost'].map((variant) => (
        <div key={variant} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ width: '64px', fontSize: '12px', opacity: 0.7 }}>{variant}</span>
          <StatusBadge status="success" variant={variant}>Success</StatusBadge>
          <StatusBadge status="info" variant={variant}>Info</StatusBadge>
          <StatusBadge status="warning" variant={variant}>Warning</StatusBadge>
          <StatusBadge status="danger" variant={variant}>Error</StatusBadge>
        </div>
      ))}
    </div>
  )
};

export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <StatusBadge status="info" size="xs">Extra small</StatusBadge>
      <StatusBadge status="info" size="sm">Small</StatusBadge>
      <StatusBadge status="info" size="md">Medium</StatusBadge>
    </div>
  )
};

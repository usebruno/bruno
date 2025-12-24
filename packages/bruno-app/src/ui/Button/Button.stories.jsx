import React from 'react';
import Button from './index';

export default {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'base', 'md', 'lg'],
      description: 'The size of the button'
    },
    variant: {
      control: 'select',
      options: ['filled', 'outline', 'ghost'],
      description: 'The visual style variant of the button'
    },
    color: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger'],
      description: 'The color of the button'
    },
    fontWeight: {
      control: 'select',
      options: ['regular', 'medium'],
      description: 'Font weight (default: regular for filled/ghost, medium for outline)'
    },
    rounded: {
      control: 'select',
      options: ['sm', 'base', 'md', 'lg', 'full'],
      description: 'Border radius style'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled'
    },
    loading: {
      control: 'boolean',
      description: 'Whether the button is in loading state'
    },
    fullWidth: {
      control: 'boolean',
      description: 'Whether the button takes full width'
    },
    iconPosition: {
      control: 'select',
      options: ['left', 'right'],
      description: 'Position of the icon relative to text'
    },
    children: {
      control: 'text',
      description: 'Button text content'
    },
    onClick: { action: 'clicked' },
    onDoubleClick: { action: 'double-clicked' },
    onMouseEnter: { action: 'mouse-entered' },
    onMouseLeave: { action: 'mouse-left' }
  }
};

// Sample icon component for stories
const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const SendIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
  </svg>
);

// Default story
export const Default = {
  args: {
    children: 'Button'
  }
};

// Variants
export const Filled = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <Button variant="filled" color="primary">Primary</Button>
      <Button variant="filled" color="secondary">Secondary</Button>
      <Button variant="filled" color="success">Success</Button>
      <Button variant="filled" color="warning">Warning</Button>
      <Button variant="filled" color="danger">Danger</Button>
    </div>
  )
};

export const Outline = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <Button variant="outline" color="primary">Primary</Button>
      <Button variant="outline" color="secondary">Secondary</Button>
      <Button variant="outline" color="success">Success</Button>
      <Button variant="outline" color="warning">Warning</Button>
      <Button variant="outline" color="danger">Danger</Button>
    </div>
  )
};

export const Ghost = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <Button variant="ghost" color="primary">Primary</Button>
      <Button variant="ghost" color="secondary">Secondary</Button>
      <Button variant="ghost" color="success">Success</Button>
      <Button variant="ghost" color="warning">Warning</Button>
      <Button variant="ghost" color="danger">Danger</Button>
    </div>
  )
};

// With Icons
export const WithIconLeft = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Filled</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="filled" size="xs" icon={<PlusIcon />} iconPosition="left">Add</Button>
          <Button variant="filled" size="sm" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
          <Button variant="filled" size="base" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
          <Button variant="filled" size="md" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
          <Button variant="filled" size="lg" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Outline</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="outline" size="xs" icon={<PlusIcon />} iconPosition="left">Add</Button>
          <Button variant="outline" size="sm" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
          <Button variant="outline" size="base" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
          <Button variant="outline" size="md" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
          <Button variant="outline" size="lg" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Ghost</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" size="xs" icon={<PlusIcon />} iconPosition="left">Add</Button>
          <Button variant="ghost" size="sm" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
          <Button variant="ghost" size="base" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
          <Button variant="ghost" size="md" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
          <Button variant="ghost" size="lg" icon={<PlusIcon />} iconPosition="left">Add Item</Button>
        </div>
      </div>
    </div>
  )
};

export const WithIconRight = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Filled</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="filled" size="xs" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="filled" size="sm" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="filled" size="base" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="filled" size="md" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="filled" size="lg" icon={<SendIcon />} iconPosition="right">Send</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Outline</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="outline" size="xs" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="outline" size="sm" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="outline" size="base" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="outline" size="md" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="outline" size="lg" icon={<SendIcon />} iconPosition="right">Send</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Ghost</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" size="xs" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="ghost" size="sm" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="ghost" size="base" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="ghost" size="md" icon={<SendIcon />} iconPosition="right">Send</Button>
          <Button variant="ghost" size="lg" icon={<SendIcon />} iconPosition="right">Send</Button>
        </div>
      </div>
    </div>
  )
};

export const IconOnly = {
  args: {
    icon: <PlusIcon />,
    rounded: 'full',
    size: 'base'
  }
};

// States
export const Disabled = {
  render: () => (
    <div style={{ display: 'flex', gap: '48px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>Enabled</h3>
        <Button variant="filled" color="primary">Primary</Button>
        <Button variant="filled" color="secondary">Secondary</Button>
        <Button variant="filled" color="success">Success</Button>
        <Button variant="filled" color="warning">Warning</Button>
        <Button variant="filled" color="danger">Danger</Button>
        <Button variant="outline" color="primary">Outline</Button>
        <Button variant="ghost" color="primary">Ghost</Button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ marginBottom: '4px', fontSize: '14px', fontWeight: 600 }}>Disabled</h3>
        <Button variant="filled" color="primary" disabled>Primary</Button>
        <Button variant="filled" color="secondary" disabled>Secondary</Button>
        <Button variant="filled" color="success" disabled>Success</Button>
        <Button variant="filled" color="warning" disabled>Warning</Button>
        <Button variant="filled" color="danger" disabled>Danger</Button>
        <Button variant="outline" color="primary" disabled>Outline</Button>
        <Button variant="ghost" color="primary" disabled>Ghost</Button>
      </div>
    </div>
  )
};

export const Loading = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Filled</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="filled" size="xs" loading>Loading</Button>
          <Button variant="filled" size="sm" loading>Loading</Button>
          <Button variant="filled" size="base" loading>Loading</Button>
          <Button variant="filled" size="md" loading>Loading</Button>
          <Button variant="filled" size="lg" loading>Loading</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Outline</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="outline" size="xs" loading>Loading</Button>
          <Button variant="outline" size="sm" loading>Loading</Button>
          <Button variant="outline" size="base" loading>Loading</Button>
          <Button variant="outline" size="md" loading>Loading</Button>
          <Button variant="outline" size="lg" loading>Loading</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Ghost</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" size="xs" loading>Loading</Button>
          <Button variant="ghost" size="sm" loading>Loading</Button>
          <Button variant="ghost" size="base" loading>Loading</Button>
          <Button variant="ghost" size="md" loading>Loading</Button>
          <Button variant="ghost" size="lg" loading>Loading</Button>
        </div>
      </div>
    </div>
  )
};

// Rounded variants
export const Rounded = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <Button rounded="sm">Small</Button>
      <Button rounded="base">Base</Button>
      <Button rounded="md">Medium</Button>
      <Button rounded="lg">Large</Button>
      <Button rounded="full">Full</Button>
    </div>
  )
};

// Full Width
export const FullWidth = {
  args: {
    children: 'Full Width Button',
    fullWidth: true
  },
  decorators: [
    (Story) => (
      <div style={{ width: '300px' }}>
        <Story />
      </div>
    )
  ]
};

// Combined Examples
export const DangerWithIcon = {
  args: {
    children: 'Delete',
    variant: 'filled',
    color: 'danger',
    icon: <TrashIcon />
  }
};

// All Colors Showcase
export const AllColors = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Filled Variant</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="filled" color="primary">Primary</Button>
          <Button variant="filled" color="secondary">Secondary</Button>
          <Button variant="filled" color="success">Success</Button>
          <Button variant="filled" color="warning">Warning</Button>
          <Button variant="filled" color="danger">Danger</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Outline Variant</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="outline" color="primary">Primary</Button>
          <Button variant="outline" color="secondary">Secondary</Button>
          <Button variant="outline" color="success">Success</Button>
          <Button variant="outline" color="warning">Warning</Button>
          <Button variant="outline" color="danger">Danger</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Ghost Variant</h3>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Button variant="ghost" color="primary">Primary</Button>
          <Button variant="ghost" color="secondary">Secondary</Button>
          <Button variant="ghost" color="success">Success</Button>
          <Button variant="ghost" color="warning">Warning</Button>
          <Button variant="ghost" color="danger">Danger</Button>
        </div>
      </div>
    </div>
  )
};

// All Sizes Showcase
export const AllSizes = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Filled</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="filled" size="xs">Extra Small</Button>
          <Button variant="filled" size="sm">Small</Button>
          <Button variant="filled" size="base">Base</Button>
          <Button variant="filled" size="md">Medium</Button>
          <Button variant="filled" size="lg">Large</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Outline</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="outline" size="xs">Extra Small</Button>
          <Button variant="outline" size="sm">Small</Button>
          <Button variant="outline" size="base">Base</Button>
          <Button variant="outline" size="md">Medium</Button>
          <Button variant="outline" size="lg">Large</Button>
        </div>
      </div>
      <div>
        <h3 style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 600 }}>Ghost</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Button variant="ghost" size="xs">Extra Small</Button>
          <Button variant="ghost" size="sm">Small</Button>
          <Button variant="ghost" size="base">Base</Button>
          <Button variant="ghost" size="md">Medium</Button>
          <Button variant="ghost" size="lg">Large</Button>
        </div>
      </div>
    </div>
  )
};

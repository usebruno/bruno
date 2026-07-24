import React from 'react';
import { IconTrash, IconPencil, IconCopy, IconDots, IconRefresh } from '@tabler/icons';
import ActionIcon from './index';

export default {
  title: 'Components/ActionIcon',
  component: ActionIcon,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'An icon-only button (subtle style). Takes an accessible `label` '
          + '(used for title + aria-label), and supports sizes plus per-instance '
          + 'color and hover-color overrides.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['subtle'],
      description: 'Visual variant (only "subtle" is implemented today)'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the button'
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled'
    },
    label: {
      control: 'text',
      description: 'Label used for both title and aria-label (accessibility)'
    },
    colorOnHover: {
      control: 'text',
      description: 'Icon color on hover/focus (e.g. \'red\', \'var(--color-danger)\')'
    },
    color: {
      control: 'text',
      description: 'Overrides the default variant icon color'
    },
    onClick: { action: 'clicked' }
  }
};

export const Default = {
  args: {
    children: <IconPencil size={16} strokeWidth={1.5} />,
    label: 'Edit'
  }
};

export const Colors = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <ActionIcon label="Default"><IconPencil size={16} strokeWidth={1.5} /></ActionIcon>
      <ActionIcon label="Brand" color="var(--color-brand, #546de5)"><IconPencil size={16} strokeWidth={1.5} /></ActionIcon>
      <ActionIcon label="Danger" color="var(--color-text-danger, #ef4444)"><IconTrash size={16} strokeWidth={1.5} /></ActionIcon>
    </div>
  )
};

export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <ActionIcon size="sm" label="Small"><IconTrash size={16} strokeWidth={1.5} /></ActionIcon>
      <ActionIcon size="md" label="Medium"><IconTrash size={18} strokeWidth={1.5} /></ActionIcon>
      <ActionIcon size="lg" label="Large"><IconTrash size={20} strokeWidth={1.5} /></ActionIcon>
    </div>
  )
};

export const ColorOnHover = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
      <ActionIcon label="Delete" colorOnHover="var(--color-text-danger, #ef4444)">
        <IconTrash size={16} strokeWidth={1.5} />
      </ActionIcon>
    </div>
  )
};

export const Disabled = {
  args: {
    children: <IconTrash size={16} strokeWidth={1.5} />,
    label: 'Delete',
    disabled: true
  }
};

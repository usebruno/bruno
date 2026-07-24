import React from 'react';
import { IconChevronDown, IconPencil, IconCopy, IconTrash } from '@tabler/icons';
import MenuDropdown from './index';
import Button from 'ui/Button';

export default {
  title: 'Components/MenuDropdown',
  component: MenuDropdown,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A dropdown menu with keyboard navigation. Accepts items in flat, grouped, '
          + 'or standard formats, and supports submenus, selection tick marks, '
          + 'header/footer content, and controlled or uncontrolled open state. '
          + 'See the props table below for the full API.'
      },
      // Render each story in an iframe so the opened menu (a popover) isn't
      // clipped by the inline Docs preview container.
      story: { inline: false, height: '360px' }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom-end', 'top-start', 'top-end'],
      description: 'Tippy placement of the menu'
    },
    showTickMark: {
      control: 'boolean',
      description: 'Show a checkmark on the selected item'
    }
  }
};

const Trigger = (
  <Button icon={<IconChevronDown size={16} strokeWidth={1.5} />} iconPosition="right">
    Actions
  </Button>
);

const items = [
  { id: 'edit', label: 'Edit', leftSection: IconPencil, onClick: () => {} },
  { id: 'duplicate', label: 'Duplicate', leftSection: IconCopy, onClick: () => {} },
  { type: 'divider', id: 'divider-1' },
  { id: 'delete', label: 'Delete', leftSection: IconTrash, onClick: () => {} }
];

export const Default = {
  render: (args) => (
    <MenuDropdown items={items} placement={args.placement}>
      {Trigger}
    </MenuDropdown>
  ),
  args: {
    placement: 'bottom-end'
  }
};

export const Grouped = {
  render: () => (
    <MenuDropdown
      items={[
        { name: 'Edit', options: [
          { id: 'rename', label: 'Rename', onClick: () => {} },
          { id: 'clone', label: 'Clone', onClick: () => {} }
        ] },
        { name: 'Danger', options: [
          { id: 'remove', label: 'Remove', onClick: () => {} }
        ] }
      ]}
    >
      {Trigger}
    </MenuDropdown>
  )
};

export const WithSelection = {
  render: () => (
    <MenuDropdown
      selectedItemId="post"
      items={[
        { id: 'get', label: 'GET', onClick: () => {} },
        { id: 'post', label: 'POST', onClick: () => {} },
        { id: 'put', label: 'PUT', onClick: () => {} }
      ]}
    >
      {Trigger}
    </MenuDropdown>
  )
};

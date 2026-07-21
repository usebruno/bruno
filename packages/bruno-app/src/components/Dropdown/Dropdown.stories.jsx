import React, { forwardRef } from 'react';
import { IconChevronDown } from '@tabler/icons';
import Dropdown from './index';
import Button from 'ui/Button';

export default {
  title: 'Components/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A dropdown popover built on Tippy. Pass the trigger element as `icon` '
          + 'and the menu content as children. Uncontrolled (opens on click) by '
          + 'default, or controlled via the `visible` prop.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    placement: {
      control: 'select',
      options: ['bottom-start', 'bottom-end', 'top-start', 'top-end', 'right', 'left'],
      description: 'Tippy placement of the popover'
    }
  }
};

// Tippy requires the trigger to forward a ref.
const Trigger = forwardRef((props, ref) => (
  <div ref={ref} {...props}>
    <Button icon={<IconChevronDown size={16} strokeWidth={1.5} />} iconPosition="right">
      Menu
    </Button>
  </div>
));

export const Default = {
  // Roomy, centered container so the popover has space in every placement
  // (rendered inline in Docs so the `placement` control drives it live).
  render: (args) => (
    <div style={{ minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Dropdown icon={<Trigger />} placement={args.placement}>
        <div style={{ minWidth: 160, padding: '4px 0' }}>
          <div className="dropdown-item" style={{ padding: '6px 12px', cursor: 'pointer' }}>Edit</div>
          <div className="dropdown-item" style={{ padding: '6px 12px', cursor: 'pointer' }}>Duplicate</div>
          <div className="dropdown-item" style={{ padding: '6px 12px', cursor: 'pointer' }}>Delete</div>
        </div>
      </Dropdown>
    </div>
  ),
  args: {
    placement: 'bottom-end'
  }
};

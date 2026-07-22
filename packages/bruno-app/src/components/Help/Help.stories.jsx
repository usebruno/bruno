import React from 'react';
import Help from './index';

export default {
  title: 'Components/Help',
  component: Help,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A hover help tooltip. Renders a small question/info icon; hovering it '
          + 'shows a positioned tooltip (portaled to the body) with the provided '
          + 'content. Configurable placement, width, icon, and size. Hover the icon '
          + 'in the preview to see the tooltip.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    icon: {
      control: 'inline-radio',
      options: ['question', 'info'],
      description: 'Built-in icon'
    },
    placement: {
      control: 'inline-radio',
      options: ['top', 'right', 'bottom', 'left'],
      description: 'Tooltip placement relative to the icon'
    },
    width: { control: 'number', description: 'Tooltip width (px)' },
    size: { control: 'number', description: 'Icon size (px)' },
    children: { control: 'text', description: 'Tooltip content' }
  }
};

export const Default = {
  args: {
    children: 'This field controls the request timeout in milliseconds.',
    placement: 'right',
    icon: 'question',
    width: 200,
    size: 14
  }
};

export const InfoIcon = {
  args: {
    ...Default.args,
    icon: 'info'
  }
};

export const Placements = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 64, padding: 48 }}>
      {['top', 'right', 'bottom', 'left'].map((placement) => (
        <Help key={placement} {...args} placement={placement}>
          {`Tooltip placed on the ${placement}.`}
        </Help>
      ))}
    </div>
  ),
  args: {
    icon: 'question',
    width: 160
  }
};

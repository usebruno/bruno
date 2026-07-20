import React from 'react';
import MethodBadge from './index';

export default {
  title: 'Components/MethodBadge',
  component: MethodBadge,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    method: {
      control: 'select',
      options: ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'],
      description: 'HTTP method'
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Size of the badge'
    }
  }
};

export const Default = {
  args: {
    method: 'get'
  }
};

export const AllMethods = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
      <MethodBadge method="get" />
      <MethodBadge method="post" />
      <MethodBadge method="put" />
      <MethodBadge method="patch" />
      <MethodBadge method="delete" />
      <MethodBadge method="options" />
      <MethodBadge method="head" />
    </div>
  )
};

export const Sizes = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
      <MethodBadge method="post" size="sm" />
      <MethodBadge method="post" size="md" />
      <MethodBadge method="post" size="lg" />
    </div>
  )
};

import React, { useState } from 'react';
import ToggleSwitch from './index';

export default {
  title: 'Components/ToggleSwitch',
  component: ToggleSwitch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A binary on/off toggle switch. Controlled via `isOn` + `handleToggle`. '
          + 'Supports sizes 2xs–2xl and an optional `activeColor` for the "on" track.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['2xs', 'xs', 's', 'm', 'l', 'xl', '2xl'],
      description: 'Size preset (default: m)'
    },
    activeColor: {
      control: 'text',
      description: 'Track color when on (defaults to theme.primary.solid)'
    },
    isOn: {
      control: 'boolean',
      description: 'On/off state'
    }
  }
};

export const Default = {
  render: (args) => {
    const [isOn, setIsOn] = useState(false);
    return <ToggleSwitch {...args} isOn={isOn} handleToggle={() => setIsOn((v) => !v)} />;
  }
};

export const Sizes = {
  render: () => {
    const [isOn, setIsOn] = useState(true);
    const toggle = () => setIsOn((v) => !v);
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {['xs', 's', 'm', 'l', 'xl'].map((size) => (
          <ToggleSwitch key={size} size={size} isOn={isOn} handleToggle={toggle} />
        ))}
      </div>
    );
  }
};

export const States = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <ToggleSwitch isOn={false} handleToggle={() => {}} />
      <ToggleSwitch isOn={true} handleToggle={() => {}} />
    </div>
  )
};

export const CustomActiveColor = {
  render: (args) => {
    const [isOn, setIsOn] = useState(true);
    return <ToggleSwitch {...args} activeColor="#16a34a" isOn={isOn} handleToggle={() => setIsOn((v) => !v)} />;
  }
};

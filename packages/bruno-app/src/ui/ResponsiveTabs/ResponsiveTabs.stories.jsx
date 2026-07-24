import React, { useState } from 'react';
import ResponsiveTabs from './index';

export default {
  title: 'Components/ResponsiveTabs',
  component: ResponsiveTabs,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
};

const tabs = [
  { key: 'params', label: 'Params' },
  { key: 'body', label: 'Body' },
  { key: 'headers', label: 'Headers' },
  { key: 'auth', label: 'Auth' },
  { key: 'vars', label: 'Vars' },
  { key: 'scripts', label: 'Scripts' },
  { key: 'assert', label: 'Assert' },
  { key: 'tests', label: 'Tests' },
  { key: 'docs', label: 'Docs' }
];

const Demo = ({ width }) => {
  const [activeTab, setActiveTab] = useState('params');
  return (
    <div style={{ width }}>
      <ResponsiveTabs tabs={tabs} activeTab={activeTab} onTabSelect={setActiveTab} />
    </div>
  );
};

// Wide container: all tabs fit.
export const Default = {
  render: () => <Demo width="100%" />
};

// Narrow container: overflowing tabs collapse into the ">>" dropdown.
// Rendered in a taller iframe so the opened overflow menu isn't clipped.
export const Overflowing = {
  parameters: { docs: { story: { inline: false, height: '360px' } } },
  render: () => <Demo width="360px" />
};

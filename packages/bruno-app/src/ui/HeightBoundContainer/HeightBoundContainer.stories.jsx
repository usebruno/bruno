import React from 'react';
import HeightBoundContainer from './index';

export default {
  title: 'Components/HeightBoundContainer',
  component: HeightBoundContainer,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs']
};

// HeightBoundContainer constrains its children to the available height and lets
// a flex child scroll instead of overflowing the layout. Give it a bounded
// parent to see the effect.
export const Default = {
  render: () => (
    <div style={{ height: '240px', border: '1px dashed var(--color-border, #ccc)', borderRadius: 4 }}>
      <HeightBoundContainer>
        <div style={{ overflow: 'auto', width: '100%' }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={{ padding: '6px 12px' }}>Row {i + 1}</div>
          ))}
        </div>
      </HeightBoundContainer>
    </div>
  )
};

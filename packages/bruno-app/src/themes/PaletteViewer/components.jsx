import React from 'react';

// Shorten long names for display
const formatName = (name) => {
  if (name === 'CONTROL_ACCENT') return 'CTRL_ACC';
  return name;
};

// Shorten HSL colors for display
const formatColor = (color) => {
  if (color.startsWith('hsl(')) {
    // Handle all HSL formats: "hsl(0 70% 71%)", "hsl(0, 70%, 71%)", "hsl(0deg 0% 10%)"
    const match = color.match(/hsl\((\d+)(?:deg)?\s*,?\s*(\d+)%\s*,?\s*(\d+)%\)/);
    if (match) {
      return `${match[1]}/${match[2]}/${match[3]}`;
    }
  }
  return color;
};

export const ColorSwatch = ({ name, color, textColor = '#cccccc', size = 56 }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color,
        borderRadius: '8px',
        border: '1px solid rgba(128,128,128,0.2)'
      }}
    />
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: textColor }}>{formatName(name)}</div>
      <div style={{ fontSize: '9px', color: textColor, opacity: 0.7, fontFamily: 'monospace' }}>{formatColor(color)}</div>
    </div>
  </div>
);

export const ColorSection = ({ title, colors, textColor = '#cccccc', size = 56 }) => (
  <div style={{ marginBottom: '24px' }}>
    <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: textColor }}>{title}</h3>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
      {Object.entries(colors).map(([name, color]) => (
        <ColorSwatch key={name} name={name} color={color} textColor={textColor} size={size} />
      ))}
    </div>
  </div>
);

import React from 'react';
import { palette } from '../light/light';
import { ColorSwatch, ColorSection } from './components';

const textColor = '#343434';
const mutedColor = '#666666';

export default {
  title: 'Themes/Light Palette',
  parameters: {
    layout: 'padded'
  }
};

export const Overview = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: palette.background.BASE, minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: textColor }}>
        Light Theme Palette
      </h1>
      <p style={{ fontSize: '14px', color: mutedColor, marginBottom: '32px' }}>
        14 accent colors with full hue coverage
      </p>
      <ColorSection title="Accents" colors={palette.accents} textColor={textColor} />
      <ColorSection title="System" colors={palette.system} textColor={textColor} />
      <ColorSection title="Background" colors={palette.background} textColor={textColor} />
      <ColorSection title="Text" colors={palette.text} textColor={textColor} />
      <ColorSection title="Overlay" colors={palette.overlay} textColor={textColor} />
      <ColorSection title="Border" colors={palette.border} textColor={textColor} />
      <ColorSection title="Utility" colors={palette.utility} textColor={textColor} />
    </div>
  )
};

export const Accents = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: palette.background.BASE }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: textColor }}>
        Accent Colors
      </h2>
      <p style={{ fontSize: '13px', color: mutedColor, marginBottom: '24px' }}>
        Warm &rarr; Cool progression across the color wheel
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {Object.entries(palette.accents).map(([name, color]) => (
          <ColorSwatch key={name} name={name} color={color} textColor={textColor} />
        ))}
      </div>
    </div>
  )
};

export const Background = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: palette.background.BASE }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: textColor }}>
        Background Colors
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {Object.entries(palette.background).map(([name, color]) => (
          <ColorSwatch key={name} name={name} color={color} textColor={textColor} />
        ))}
      </div>
    </div>
  )
};

export const Text = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: palette.background.BASE }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: textColor }}>
        Text Colors
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {Object.entries(palette.text).map(([name, color]) => (
          <ColorSwatch key={name} name={name} color={color} textColor={textColor} />
        ))}
      </div>
    </div>
  )
};

export const HueWheel = {
  render: () => {
    const accents = Object.entries(palette.accents);
    // Sort by hue for visualization
    const sorted = [...accents].sort((a, b) => {
      const hueA = parseInt(a[1].match(/hsl\((\d+)/)?.[1] || 0);
      const hueB = parseInt(b[1].match(/hsl\((\d+)/)?.[1] || 0);
      return hueA - hueB;
    });

    return (
      <div style={{ padding: '24px', backgroundColor: palette.background.BASE }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: textColor }}>
          Hue Distribution
        </h2>
        <p style={{ fontSize: '13px', color: mutedColor, marginBottom: '24px' }}>
          Colors sorted by hue value (0&deg; &rarr; 360&deg;)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map(([name, color]) => {
            const hueMatch = color.match(/hsl\((\d+)/);
            const hue = hueMatch ? parseInt(hueMatch[1]) : 0;
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '70px', fontSize: '12px', fontWeight: 600, color: textColor }}>{name}</div>
                <div style={{ width: '40px', fontSize: '11px', color: mutedColor, fontFamily: 'monospace' }}>{hue}&deg;</div>
                <div
                  style={{
                    width: `${(hue / 360) * 280 + 50}px`,
                    height: '28px',
                    backgroundColor: color,
                    borderRadius: '4px'
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
};

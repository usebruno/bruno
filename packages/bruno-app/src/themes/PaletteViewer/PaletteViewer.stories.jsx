import React from 'react';

// Light theme palette - 14 accent colors
const palette = {
  accents: {
    PRIMARY: '#bd7a28',
    RED: 'hsl(8 60% 52%)', // warm coral - NEW
    ROSE: 'hsl(352 45% 50%)', // soft red (approved)
    BROWN: 'hsl(28 55% 38%)', // warm brown (liked)
    ORANGE: 'hsl(35 85% 42%)', // vibrant orange
    YELLOW: 'hsl(45 75% 42%)', // golden yellow
    LIME: 'hsl(85 45% 40%)', // yellow-green - NEW
    GREEN: 'hsl(145 50% 36%)', // forest green
    TEAL: 'hsl(178 50% 36%)', // true teal
    CYAN: 'hsl(195 55% 42%)', // cyan-blue - NEW
    BLUE: 'hsl(214 55% 45%)', // true blue (liked)
    INDIGO: 'hsl(235 45% 45%)', // deep indigo
    VIOLET: 'hsl(258 42% 50%)', // soft violet - NEW
    PURPLE: 'hsl(280 45% 48%)', // rich purple
    PINK: 'hsl(328 50% 48%)' // magenta-pink - NEW
  },
  system: {
    CONTROL_ACCENT: '#b96f1d' // for accent-color
  },
  background: {
    BASE: '#ffffff',
    MANTLE: '#f8f8f8',
    CRUST: '#f1f1f1',
    SURFACE0: '#f1f1f1',
    SURFACE1: '#eaeaea',
    SURFACE2: '#e5e5e5'
  },
  text: {
    BASE: '#343434',
    SUBTEXT2: '#666666',
    SUBTEXT1: '#838383',
    SUBTEXT0: '#9B9B9B'
  },
  overlay: {
    OVERLAY2: '#8b8b8b',
    OVERLAY1: '#B0B0B0',
    OVERLAY0: '#C0C0C0'
  },
  border: {
    BORDER2: '#cccccc',
    BORDER1: '#e5e5e5',
    BORDER0: '#efefef'
  },
  utility: {
    WHITE: '#ffffff',
    BLACK: '#000000'
  }
};

const ColorSwatch = ({ name, color, textColor = '#343434' }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
    <div
      style={{
        width: '80px',
        height: '80px',
        backgroundColor: color,
        borderRadius: '8px',
        border: '1px solid #e5e5e5',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}
    />
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '11px', fontWeight: 600, color: textColor }}>{name}</div>
      <div style={{ fontSize: '9px', color: '#666666', fontFamily: 'monospace' }}>{color}</div>
    </div>
  </div>
);

const ColorSection = ({ title, colors, textColor }) => (
  <div style={{ marginBottom: '32px' }}>
    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#343434' }}>{title}</h3>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
      {Object.entries(colors).map(([name, color]) => (
        <ColorSwatch key={name} name={name} color={color} textColor={textColor} />
      ))}
    </div>
  </div>
);

export default {
  title: 'Themes/Light Palette',
  parameters: {
    layout: 'padded'
  }
};

export const Overview = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', color: '#343434' }}>
        Light Theme Palette
      </h1>
      <p style={{ fontSize: '14px', color: '#666666', marginBottom: '32px' }}>
        14 accent colors with full hue coverage
      </p>
      <ColorSection title="Accents" colors={palette.accents} />
      <ColorSection title="Background" colors={palette.background} />
      <ColorSection title="Text" colors={palette.text} />
      <ColorSection title="Overlay" colors={palette.overlay} />
      <ColorSection title="Border" colors={palette.border} />
      <ColorSection title="Utility" colors={palette.utility} />
    </div>
  )
};

export const Accents = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: '#ffffff' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#343434' }}>
        Accent Colors
      </h2>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px' }}>
        Warm → Cool progression across the color wheel
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {Object.entries(palette.accents).map(([name, color]) => (
          <ColorSwatch key={name} name={name} color={color} />
        ))}
      </div>
    </div>
  )
};

export const Background = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: '#ffffff' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#343434' }}>
        Background Colors
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {Object.entries(palette.background).map(([name, color]) => (
          <ColorSwatch key={name} name={name} color={color} />
        ))}
      </div>
    </div>
  )
};

export const Text = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: '#ffffff' }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#343434' }}>
        Text Colors
      </h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
        {Object.entries(palette.text).map(([name, color]) => (
          <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                backgroundColor: color,
                borderRadius: '8px',
                border: '1px solid #e5e5e5',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
              }}
            />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#343434' }}>{name}</div>
              <div style={{ fontSize: '9px', color: '#666666', fontFamily: 'monospace' }}>{color}</div>
            </div>
          </div>
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
      <div style={{ padding: '24px', backgroundColor: '#ffffff' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', color: '#343434' }}>
          Hue Distribution
        </h2>
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '24px' }}>
          Colors sorted by hue value (0° → 360°)
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sorted.map(([name, color]) => {
            const hueMatch = color.match(/hsl\((\d+)/);
            const hue = hueMatch ? parseInt(hueMatch[1]) : 0;
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '70px', fontSize: '12px', fontWeight: 600 }}>{name}</div>
                <div style={{ width: '40px', fontSize: '11px', color: '#666', fontFamily: 'monospace' }}>{hue}°</div>
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

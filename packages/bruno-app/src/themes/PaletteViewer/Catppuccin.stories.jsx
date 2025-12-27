import React from 'react';

// Catppuccin Latte (Light)
const latte = {
  name: 'Latte',
  mode: 'light',
  base: '#eff1f5',
  accents: {
    ROSEWATER: '#dc8a78',
    FLAMINGO: '#dd7878',
    PINK: '#ea76cb',
    MAUVE: '#8839ef',
    RED: '#d20f39',
    MAROON: '#e64553',
    PEACH: '#fe640b',
    YELLOW: '#df8e1d',
    GREEN: '#40a02b',
    TEAL: '#179299',
    SKY: '#04a5e5',
    SAPPHIRE: '#209fb5',
    BLUE: '#1e66f5',
    LAVENDER: '#7287fd'
  },
  surface: {
    TEXT: '#4c4f69',
    SUBTEXT1: '#5c5f77',
    SUBTEXT0: '#6c6f85',
    OVERLAY2: '#7c7f93',
    OVERLAY1: '#8c8fa1',
    OVERLAY0: '#9ca0b0',
    SURFACE2: '#acb0be',
    SURFACE1: '#bcc0cc',
    SURFACE0: '#ccd0da',
    BASE: '#eff1f5',
    MANTLE: '#e6e9ef',
    CRUST: '#dce0e8'
  }
};

// Catppuccin Frappé (Dark)
const frappe = {
  name: 'Frappé',
  mode: 'dark',
  base: '#303446',
  accents: {
    ROSEWATER: '#f2d5cf',
    FLAMINGO: '#eebebe',
    PINK: '#f4b8e4',
    MAUVE: '#ca9ee6',
    RED: '#e78284',
    MAROON: '#ea999c',
    PEACH: '#ef9f76',
    YELLOW: '#e5c890',
    GREEN: '#a6d189',
    TEAL: '#81c8be',
    SKY: '#99d1db',
    SAPPHIRE: '#85c1dc',
    BLUE: '#8caaee',
    LAVENDER: '#babbf1'
  },
  surface: {
    TEXT: '#c6d0f5',
    SUBTEXT1: '#b5bfe2',
    SUBTEXT0: '#a5adce',
    OVERLAY2: '#949cbb',
    OVERLAY1: '#838ba7',
    OVERLAY0: '#737994',
    SURFACE2: '#626880',
    SURFACE1: '#51576d',
    SURFACE0: '#414559',
    BASE: '#303446',
    MANTLE: '#292c3c',
    CRUST: '#232634'
  }
};

// Catppuccin Macchiato (Dark)
const macchiato = {
  name: 'Macchiato',
  mode: 'dark',
  base: '#24273a',
  accents: {
    ROSEWATER: '#f4dbd6',
    FLAMINGO: '#f0c6c6',
    PINK: '#f5bde6',
    MAUVE: '#c6a0f6',
    RED: '#ed8796',
    MAROON: '#ee99a0',
    PEACH: '#f5a97f',
    YELLOW: '#eed49f',
    GREEN: '#a6da95',
    TEAL: '#8bd5ca',
    SKY: '#91d7e3',
    SAPPHIRE: '#7dc4e4',
    BLUE: '#8aadf4',
    LAVENDER: '#b7bdf8'
  },
  surface: {
    TEXT: '#cad3f5',
    SUBTEXT1: '#b8c0e0',
    SUBTEXT0: '#a5adcb',
    OVERLAY2: '#939ab7',
    OVERLAY1: '#8087a2',
    OVERLAY0: '#6e738d',
    SURFACE2: '#5b6078',
    SURFACE1: '#494d64',
    SURFACE0: '#363a4f',
    BASE: '#24273a',
    MANTLE: '#1e2030',
    CRUST: '#181926'
  }
};

// Catppuccin Mocha (Dark)
const mocha = {
  name: 'Mocha',
  mode: 'dark',
  base: '#1e1e2e',
  accents: {
    ROSEWATER: '#f5e0dc',
    FLAMINGO: '#f2cdcd',
    PINK: '#f5c2e7',
    MAUVE: '#cba6f7',
    RED: '#f38ba8',
    MAROON: '#eba0ac',
    PEACH: '#fab387',
    YELLOW: '#f9e2af',
    GREEN: '#a6e3a1',
    TEAL: '#94e2d5',
    SKY: '#89dceb',
    SAPPHIRE: '#74c7ec',
    BLUE: '#89b4fa',
    LAVENDER: '#b4befe'
  },
  surface: {
    TEXT: '#cdd6f4',
    SUBTEXT1: '#bac2de',
    SUBTEXT0: '#a6adc8',
    OVERLAY2: '#9399b2',
    OVERLAY1: '#7f849c',
    OVERLAY0: '#6c7086',
    SURFACE2: '#585b70',
    SURFACE1: '#45475a',
    SURFACE0: '#313244',
    BASE: '#1e1e2e',
    MANTLE: '#181825',
    CRUST: '#11111b'
  }
};

const themes = [latte, frappe, macchiato, mocha];

const ColorSwatch = ({ name, color, textColor }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
    <div
      style={{
        width: '56px',
        height: '56px',
        backgroundColor: color,
        borderRadius: '8px',
        border: '1px solid rgba(128,128,128,0.2)'
      }}
    />
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: textColor }}>{name}</div>
      <div style={{ fontSize: '9px', color: textColor, opacity: 0.7, fontFamily: 'monospace' }}>{color}</div>
    </div>
  </div>
);

const ThemeSection = ({ theme }) => {
  const textColor = theme.mode === 'dark' ? '#cdd6f4' : '#4c4f69';
  const mutedColor = theme.mode === 'dark' ? '#a6adc8' : '#6c6f85';

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: theme.base,
        borderRadius: '12px',
        marginBottom: '24px'
      }}
    >
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px', color: textColor }}>
        Catppuccin {theme.name}
      </h2>
      <p style={{ fontSize: '12px', color: mutedColor, marginBottom: '20px' }}>
        {theme.mode === 'light' ? 'Light theme' : 'Dark theme'} — Base: {theme.base}
      </p>

      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: textColor }}>
        Accents
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '24px' }}>
        {Object.entries(theme.accents).map(([name, color]) => (
          <ColorSwatch key={name} name={name} color={color} textColor={textColor} />
        ))}
      </div>

      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: textColor }}>
        Surface & Text
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
        {Object.entries(theme.surface).map(([name, color]) => (
          <ColorSwatch key={name} name={name} color={color} textColor={textColor} />
        ))}
      </div>
    </div>
  );
};

export default {
  title: 'Themes/Catppuccin',
  parameters: {
    layout: 'padded'
  }
};

export const AllFlavors = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: '#1a1a2e', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#cdd6f4' }}>
        Catppuccin Palette
      </h1>
      <p style={{ fontSize: '14px', color: '#a6adc8', marginBottom: '32px' }}>
        All 4 flavors: Latte, Frappé, Macchiato, Mocha
      </p>
      {themes.map((theme) => (
        <ThemeSection key={theme.name} theme={theme} />
      ))}
    </div>
  )
};

export const Latte = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: '#dce0e8', minHeight: '100vh' }}>
      <ThemeSection theme={latte} />
    </div>
  )
};

export const Frappe = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: '#232634', minHeight: '100vh' }}>
      <ThemeSection theme={frappe} />
    </div>
  )
};

export const Macchiato = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: '#181926', minHeight: '100vh' }}>
      <ThemeSection theme={macchiato} />
    </div>
  )
};

export const Mocha = {
  render: () => (
    <div style={{ padding: '24px', backgroundColor: '#11111b', minHeight: '100vh' }}>
      <ThemeSection theme={mocha} />
    </div>
  )
};

export const AccentComparison = {
  render: () => {
    const accentNames = Object.keys(latte.accents);

    return (
      <div style={{ padding: '24px', backgroundColor: '#1a1a2e', minHeight: '100vh' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', color: '#cdd6f4' }}>
          Accent Comparison Across Flavors
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
            <div style={{ width: '80px' }} />
            {themes.map((t) => (
              <div
                key={t.name}
                style={{
                  width: '80px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#cdd6f4'
                }}
              >
                {t.name}
              </div>
            ))}
          </div>
          {accentNames.map((name) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '80px', fontSize: '11px', fontWeight: 600, color: '#a6adc8' }}>
                {name}
              </div>
              {themes.map((t) => (
                <div
                  key={t.name}
                  style={{
                    width: '80px',
                    height: '32px',
                    backgroundColor: t.accents[name],
                    borderRadius: '4px'
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
};

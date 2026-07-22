import React from 'react';
import { useTheme } from 'styled-components';
import { palette as darkPalette } from '../dark/dark';
import { palette as lightPalette } from '../light/light';

// Shared Components
export const Section = ({ title, description, children }) => (
  <div style={{ marginBottom: '48px' }}>
    <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>{title}</h2>
    {description && (
      <p style={{ fontSize: '14px', opacity: 0.7, marginBottom: '24px', maxWidth: '600px', lineHeight: 1.6 }}>
        {description}
      </p>
    )}
    {children}
  </div>
);

export const ColorToken = ({ name, color, description, example }) => {
  const theme = useTheme();
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '16px',
      padding: '16px',
      borderRadius: '8px',
      backgroundColor: theme.dropdown.hoverBg,
      marginBottom: '12px'
    }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '8px',
        backgroundColor: color,
        flexShrink: 0,
        border: `1px solid ${theme.border.border1}`
      }}
      />
      <div style={{ flex: 1 }}>
        <div style={{
          fontFamily: 'monospace',
          fontSize: '13px',
          fontWeight: 600,
          marginBottom: '4px'
        }}
        >
          {name}
        </div>
        <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '4px' }}>
          {description}
        </div>
        {example && (
          <div style={{
            fontSize: '12px',
            opacity: 0.6,
            fontStyle: 'italic'
          }}
          >
            Example: {example}
          </div>
        )}
      </div>
      <div style={{
        fontFamily: 'monospace',
        fontSize: '11px',
        opacity: 0.5,
        flexShrink: 0
      }}
      >
        {color}
      </div>
    </div>
  );
};

export const LayerDemo = ({ layers }) => {
  const theme = useTheme();
  return (
    <div style={{
      display: 'flex',
      gap: '24px',
      flexWrap: 'wrap',
      marginTop: '16px'
    }}
    >
      {layers.map(({ name, color, description }) => (
        <div key={name} style={{ textAlign: 'center' }}>
          <div style={{
            width: '120px',
            height: '80px',
            borderRadius: '8px',
            backgroundColor: color,
            border: `1px solid ${theme.border.border1}`,
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontFamily: 'monospace',
            opacity: 0.7
          }}
          >
            {color}
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{name}</div>
          <div style={{ fontSize: '11px', opacity: 0.6, maxWidth: '120px' }}>{description}</div>
        </div>
      ))}
    </div>
  );
};

// Story Render Functions
export const IntroductionRender = () => {
  const theme = useTheme();
  const isDark = theme.mode === 'dark';
  const palette = isDark ? darkPalette : lightPalette;

  const hueColors = [
    palette.hues.RED,
    palette.hues.ORANGE,
    palette.hues.YELLOW,
    palette.hues.GREEN,
    palette.hues.TEAL,
    palette.hues.BLUE,
    palette.hues.INDIGO,
    palette.hues.PURPLE,
    palette.hues.PINK
  ];

  return (
    <div style={{
      padding: '48px 32px',
      backgroundColor: theme.bg,
      color: theme.text,
      minHeight: '100vh'
    }}
    >
      {/* Hero Section */}
      <div style={{ marginBottom: '64px' }}>
        <div style={{
          display: 'flex',
          gap: '3px',
          marginBottom: '24px'
        }}
        >
          {hueColors.map((color, i) => (
            <div
              key={i}
              style={{
                width: '32px',
                height: '6px',
                backgroundColor: color,
                borderRadius: i === 0 ? '3px 0 0 3px' : i === hueColors.length - 1 ? '0 3px 3px 0' : '0'
              }}
            />
          ))}
        </div>

        <h1 style={{
          fontSize: '40px',
          fontWeight: 700,
          marginBottom: '16px',
          letterSpacing: '-0.5px'
        }}
        >
          Bruno Design System
        </h1>

        <p style={{
          fontSize: '18px',
          opacity: 0.7,
          marginBottom: '32px',
          maxWidth: '640px',
          lineHeight: 1.7
        }}
        >
          A unified visual language for building consistent, accessible, and beautiful interfaces across Bruno's ecosystem.
        </p>

        {/* Theme indicator */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          backgroundColor: theme.background.surface0,
          borderRadius: '20px',
          fontSize: '13px',
          border: `1px solid ${theme.border.border0}`
        }}
        >
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: theme.brand
          }}
          />
          Currently viewing: <strong>{isDark ? 'Dark' : 'Light'} Theme</strong>
        </div>
      </div>

      {/* Principles Grid */}
      <Section title="Core Principles">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginTop: '24px'
        }}
        >
          {[
            {
              icon: '◐',
              title: 'Semantic',
              desc: 'Every color carries meaning. Primary draws attention, muted recedes, semantic colors (green, red, yellow) communicate status instantly.'
            },
            {
              icon: '◉',
              title: 'Layered',
              desc: 'Backgrounds stack like geological strata—crust, mantle, base—creating natural depth and visual hierarchy.'
            },
            {
              icon: '◧',
              title: 'Accessible',
              desc: 'All color combinations meet WCAG contrast requirements. Text remains readable across both light and dark themes.'
            },
            {
              icon: '◈',
              title: 'Consistent',
              desc: 'Uniform spacing, predictable colors, and harmonious typography. Every element follows the same rhythm and visual rules.'
            }
          ].map(({ icon, title, desc }) => (
            <div
              key={title}
              style={{
                padding: '24px',
                borderRadius: '12px',
                backgroundColor: theme.background.surface0,
                border: `1px solid ${theme.border.border0}`,
                transition: 'border-color 0.2s'
              }}
            >
              <div style={{
                fontSize: '24px',
                marginBottom: '12px',
                opacity: 0.8
              }}
              >{icon}
              </div>
              <div style={{
                fontWeight: 600,
                fontSize: '15px',
                marginBottom: '8px'
              }}
              >{title}
              </div>
              <div style={{
                fontSize: '13px',
                opacity: 0.7,
                lineHeight: 1.6
              }}
              >{desc}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* What's Inside */}
      <Section title="What's Inside">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginTop: '24px'
        }}
        >
          {[
            { name: 'Primary Colors', desc: '4 variants for brand identity', color: palette.primary.SOLID },
            { name: 'Backgrounds', desc: '6 layered surface colors', color: theme.background.mantle },
            { name: 'Text', desc: '8 semantic text colors', color: theme.text },
            { name: 'Borders', desc: '3 hierarchy levels', color: theme.border.border2 },
            { name: 'Overlays', desc: '3 depth levels', color: theme.overlay.overlay1 },
            { name: 'Hues', desc: '14 hue-spread colors', color: palette.hues.BLUE }
          ].map(({ name, desc, color }) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: theme.dropdown.hoverBg,
                border: `1px solid ${theme.border.border0}`
              }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: color,
                flexShrink: 0,
                border: `1px solid ${theme.border.border1}`
              }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px' }}>{name}</div>
                <div style={{ fontSize: '12px', opacity: 0.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

    </div>
  );
};

export const PrimaryColorsRender = () => {
  const theme = useTheme();
  const isDark = theme.mode === 'dark';
  const palette = isDark ? darkPalette : lightPalette;

  const primaryVariants = [
    {
      name: 'solid',
      token: 'primary.solid',
      color: palette.primary.SOLID,
      purpose: 'Buttons, toggles, active pills',
      desc: 'The foundation of interactive elements'
    },
    {
      name: 'text',
      token: 'primary.text',
      color: palette.primary.TEXT,
      purpose: 'Links, emphasized text',
      desc: 'Optimized for readable colored text'
    },
    {
      name: 'strong',
      token: 'primary.strong',
      color: palette.primary.STRONG,
      purpose: 'Thick borders, tab underlines',
      desc: 'High-visibility accents and indicators'
    },
    {
      name: 'subtle',
      token: 'primary.subtle',
      color: palette.primary.SUBTLE,
      purpose: 'Focus rings, subtle outlines',
      desc: 'Gentle emphasis without distraction'
    }
  ];

  return (
    <div style={{
      padding: '48px 32px',
      backgroundColor: theme.bg,
      color: theme.text,
      minHeight: '100vh'
    }}
    >
      {/* Hero */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>
          Primary Colors
        </h1>
        <p style={{
          fontSize: '16px',
          opacity: 0.7,
          maxWidth: '540px',
          lineHeight: 1.7
        }}
        >
          Four carefully calibrated variants of Bruno's brand color, each designed for a specific role in the interface.
        </p>
      </div>

      {/* Variant Cards */}
      <Section title="The Four Variants">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '24px'
        }}
        >
          {primaryVariants.map(({ name, token, color, purpose, desc }) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '12px 0',
                borderBottom: `1px solid ${theme.border.border0}`
              }}
            >
              {/* Color swatch */}
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: color,
                flexShrink: 0
              }}
              />

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '12px',
                  marginBottom: '4px'
                }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>{purpose}</span>
                  <code style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    opacity: 0.4
                  }}
                  >
                    {token}
                  </code>
                </div>
                <div style={{
                  fontSize: '13px',
                  opacity: 0.6,
                  lineHeight: 1.4
                }}
                >
                  {desc}
                </div>
              </div>

              {/* Color value */}
              <code style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                opacity: 0.4,
                flexShrink: 0
              }}
              >
                {color}
              </code>
            </div>
          ))}
        </div>
      </Section>

      {/* Live Examples */}
      <Section title="In Context">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          marginTop: '24px'
        }}
        >
          {/* Solid example */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ width: '100px', fontSize: '12px', opacity: 0.5, fontFamily: 'monospace' }}>solid</div>
            <button style={{
              backgroundColor: palette.primary.SOLID,
              color: isDark ? '#1a1a1a' : '#ffffff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
            >
              Primary Button
            </button>
            <div style={{
              display: 'flex',
              gap: '8px'
            }}
            >
              <div style={{
                padding: '6px 12px',
                backgroundColor: palette.primary.SOLID,
                color: isDark ? '#1a1a1a' : '#ffffff',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 500
              }}
              >Active
              </div>
              <div style={{
                padding: '6px 12px',
                backgroundColor: theme.background.surface1,
                borderRadius: '16px',
                fontSize: '12px',
                opacity: 0.7
              }}
              >Inactive
              </div>
            </div>
          </div>

          {/* Text example */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ width: '100px', fontSize: '12px', opacity: 0.5, fontFamily: 'monospace' }}>text</div>
            <span style={{ color: palette.primary.TEXT, fontSize: '14px' }}>
              View documentation →
            </span>
            <span style={{ fontSize: '14px' }}>
              Click <span style={{ color: palette.primary.TEXT, fontWeight: 500 }}>here</span> to learn more
            </span>
          </div>

          {/* Strong example */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ width: '100px', fontSize: '12px', opacity: 0.5, fontFamily: 'monospace' }}>strong</div>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{
                padding: '8px 0',
                borderBottom: `3px solid ${palette.primary.STRONG}`,
                fontSize: '14px',
                fontWeight: 500
              }}
              >Active Tab
              </div>
              <div style={{
                padding: '8px 0',
                borderBottom: '3px solid transparent',
                fontSize: '14px',
                opacity: 0.6
              }}
              >Other Tab
              </div>
            </div>
            <div style={{
              width: '120px',
              height: '6px',
              backgroundColor: theme.background.surface1,
              borderRadius: '3px',
              overflow: 'hidden'
            }}
            >
              <div style={{
                width: '70%',
                height: '100%',
                backgroundColor: palette.primary.STRONG,
                borderRadius: '3px'
              }}
              />
            </div>
          </div>

          {/* Subtle example */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
            <div style={{ width: '100px', fontSize: '12px', opacity: 0.5, fontFamily: 'monospace' }}>subtle</div>
            <input
              type="text"
              placeholder="Focused input"
              readOnly
              style={{
                padding: '8px 12px',
                border: `1px solid ${palette.primary.SUBTLE}`,
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: theme.input?.bg || 'transparent',
                color: theme.text,
                outline: 'none',
                width: '200px'
              }}
            />
          </div>
        </div>
      </Section>
    </div>
  );
};

export const BackgroundLayersRender = () => {
  const theme = useTheme();
  const isDark = theme.mode === 'dark';
  const palette = isDark ? darkPalette : lightPalette;

  const layers = [
    {
      name: 'base',
      token: 'background.base',
      color: theme.background.base,
      purpose: 'Main content area',
      desc: 'Where primary content and interactions live'
    },
    {
      name: 'mantle',
      token: 'background.mantle',
      color: theme.background.mantle,
      purpose: 'Sidebars, panels',
      desc: 'Secondary areas that frame the content'
    },
    {
      name: 'crust',
      token: 'background.crust',
      color: theme.background.crust,
      purpose: 'Status bars, app shell',
      desc: 'The deepest layer forming the foundation'
    }
  ];

  return (
    <div style={{
      padding: '48px 32px',
      backgroundColor: theme.bg,
      color: theme.text,
      minHeight: '100vh'
    }}
    >
      {/* Hero */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>
          Background Layers
        </h1>
        <p style={{
          fontSize: '16px',
          opacity: 0.7,
          maxWidth: '540px',
          lineHeight: 1.7
        }}
        >
          A layered background system inspired by geological strata. Each layer serves a distinct purpose in creating visual hierarchy.
        </p>
      </div>

      {/* App Skeleton */}
      <Section title="The Layer Model">
        <div style={{ marginTop: '24px' }}>
          {/* App frame */}
          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            border: `1px solid ${theme.border.border1}`,
            maxWidth: '600px'
          }}
          >
            {/* Title bar */}
            <div style={{
              backgroundColor: theme.background.crust,
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              borderBottom: `1px solid ${theme.border.border0}`
            }}
            >
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: theme.colors?.text?.danger || '#ff5f57' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: theme.colors?.text?.warning || '#ffbd2e' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: theme.colors?.text?.green || '#28c840' }} />
              </div>
              <div style={{ flex: 1, textAlign: 'center', fontSize: '12px', opacity: 0.5 }}>Bruno</div>
            </div>

            {/* Main area */}
            <div style={{ display: 'flex', minHeight: '360px' }}>
              {/* Sidebar - Mantle */}
              <div style={{
                width: '160px',
                backgroundColor: theme.background.mantle,
                padding: '16px 12px',
                borderRight: `1px solid ${theme.border.border0}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
              >
                <div style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: theme.primary?.text || theme.brand,
                  marginBottom: '8px'
                }}
                >mantle
                </div>
                {['Stripe API', 'GitHub REST', 'Internal Auth', 'Analytics', 'Payments'].map((item, i) => (
                  <div
                    key={item}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      borderRadius: '4px',
                      backgroundColor: i === 0 ? theme.background.surface0 : 'transparent',
                      opacity: i === 0 ? 1 : 0.6
                    }}
                  >{item}
                  </div>
                ))}
              </div>

              {/* Content - Base */}
              <div style={{
                flex: 1,
                backgroundColor: theme.background.base,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column'
              }}
              >
                <div style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: theme.primary?.text || theme.brand,
                  marginBottom: '12px'
                }}
                >base
                </div>

                {/* URL bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 12px',
                  backgroundColor: isDark ? theme.background.base : '#ffffff',
                  border: `1px solid ${theme.border.border1}`,
                  borderRadius: '6px',
                  marginBottom: '16px'
                }}
                >
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: palette.hues.GREEN
                  }}
                  >GET
                  </span>
                  <span style={{
                    fontSize: '12px',
                    opacity: 0.6
                  }}
                  >https://api.example.com/users
                  </span>
                </div>

                {/* Two-pane content */}
                <div style={{
                  flex: 1,
                  display: 'flex',
                  gap: '12px'
                }}
                >
                  {/* Payload pane */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  >
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      opacity: 0.5,
                      marginBottom: '8px'
                    }}
                    >Payload
                    </div>
                    <div style={{
                      flex: 1,
                      border: `1px solid ${theme.border.border0}`,
                      borderRadius: '4px',
                      padding: '10px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      opacity: 0.5
                    }}
                    >
                      {'{\n  "name": "...",\n  "email": "..."\n}'}
                    </div>
                  </div>
                  {/* Response pane */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                  >
                    <div style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      opacity: 0.5,
                      marginBottom: '8px'
                    }}
                    >Response
                    </div>
                    <div style={{
                      flex: 1,
                      border: `1px solid ${theme.border.border0}`,
                      borderRadius: '4px',
                      padding: '10px',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      opacity: 0.5
                    }}
                    >
                      {'{\n  "status": 200,\n  "data": [...]\n}'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status bar - Crust */}
            <div style={{
              backgroundColor: theme.background.crust,
              padding: '6px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: `1px solid ${theme.border.border0}`
            }}
            >
              <div style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                color: theme.primary?.text || theme.brand
              }}
              >crust
              </div>
              <div style={{ fontSize: '11px', opacity: 0.5 }}>Ready</div>
            </div>
          </div>
        </div>
      </Section>

      {/* Layer Definitions */}
      <Section title="Layer Definitions">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '24px'
        }}
        >
          {layers.map(({ name, token, color, purpose, desc }) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '12px 0',
                borderBottom: `1px solid ${theme.border.border0}`
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: color,
                flexShrink: 0,
                border: `1px solid ${theme.border.border1}`
              }}
              />
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '12px',
                  marginBottom: '4px'
                }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>{purpose}</span>
                  <code style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    opacity: 0.4
                  }}
                  >
                    {token}
                  </code>
                </div>
                <div style={{
                  fontSize: '13px',
                  opacity: 0.6,
                  lineHeight: 1.4
                }}
                >
                  {desc}
                </div>
              </div>
              <code style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                opacity: 0.4,
                flexShrink: 0
              }}
              >
                {color}
              </code>
            </div>
          ))}
        </div>
      </Section>

      {/* Surface Variants */}
      <Section title="Surface Variants">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '24px'
        }}
        >
          {[
            { name: 'surface0', token: 'background.surface0', color: theme.background.surface0, purpose: 'Cards & Inputs', desc: 'Slightly elevated from base, used for cards, input fields, and contained elements.' },
            { name: 'surface1', token: 'background.surface1', color: theme.background.surface1, purpose: 'Hover States', desc: 'One step brighter, indicates hover or light interaction feedback.' },
            { name: 'surface2', token: 'background.surface2', color: theme.background.surface2, purpose: 'Active States', desc: 'Highest elevation surface, used for active selections and pressed states.' }
          ].map(({ name, token, color, purpose, desc }) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '12px 0',
                borderBottom: `1px solid ${theme.border.border0}`
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: color,
                flexShrink: 0,
                border: `1px solid ${theme.border.border1}`
              }}
              />
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '12px',
                  marginBottom: '4px'
                }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>{purpose}</span>
                  <code style={{
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    opacity: 0.4
                  }}
                  >
                    {token}
                  </code>
                </div>
                <div style={{
                  fontSize: '13px',
                  opacity: 0.6,
                  lineHeight: 1.4
                }}
                >
                  {desc}
                </div>
              </div>
              <code style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                opacity: 0.4,
                flexShrink: 0
              }}
              >
                {color}
              </code>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export const TextColorsRender = () => {
  const theme = useTheme();

  const hierarchyLevels = [
    { name: 'Base', color: theme.text, desc: 'Primary content, headings, and emphasized information' },
    { name: 'Subtext2', color: theme.colors.text.subtext2, desc: 'Strong secondary text, labels, and descriptions' },
    { name: 'Subtext1', color: theme.colors.text.subtext1, desc: 'Supporting content and supplementary details' },
    { name: 'Subtext0', color: theme.colors.text.subtext0, desc: 'Timestamps, hints, placeholders, and disabled states' }
  ];

  const semanticColors = [
    { name: 'Success', color: theme.colors.text.green, desc: 'Positive states and confirmations', example: 'GET method, success messages' },
    { name: 'Danger', color: theme.colors.text.danger, desc: 'Errors and destructive actions', example: 'DELETE method, error messages' },
    { name: 'Warning', color: theme.colors.text.warning, desc: 'Caution states and notices', example: 'PUT/PATCH methods, deprecation notices' },
    { name: 'Accent', color: theme.colors.text.purple, desc: 'Special content markers', example: 'GraphQL indicators, unique tags' },
    { name: 'Link', color: theme.textLink, desc: 'Interactive text and navigation', example: 'Hyperlinks, clickable references' }
  ];

  return (
    <div style={{
      padding: '32px',
      backgroundColor: theme.bg,
      color: theme.text,
      minHeight: '100vh'
    }}
    >
      {/* Hero */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>
          Text Colors
        </h1>
        <p style={{
          fontSize: '16px',
          opacity: 0.7,
          maxWidth: '540px',
          lineHeight: 1.7
        }}
        >
          Text colors create visual hierarchy and convey meaning. Use progressively muted colors for less important information.
        </p>
      </div>

      {/* Text Hierarchy Demo */}
      <Section title="Text Hierarchy">
        {/* Demo: Collection item style */}
        <div style={{
          marginTop: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '320px'
        }}
        >
          {/* Request item 1 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${theme.border.border0}`
          }}
          >
            <span style={{ color: theme.colors.text.green, fontSize: '11px', fontWeight: 600 }}>GET</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: theme.text, fontSize: '13px', fontWeight: 500 }}>Get Users</div>
              <div style={{ color: theme.colors.text.subtext0, fontSize: '11px' }}>/api/v1/users</div>
            </div>
          </div>
          {/* Request item 2 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${theme.border.border0}`
          }}
          >
            <span style={{ color: theme.colors.text.warning, fontSize: '11px', fontWeight: 600 }}>POST</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: theme.text, fontSize: '13px', fontWeight: 500 }}>Create User</div>
              <div style={{ color: theme.colors.text.subtext0, fontSize: '11px' }}>/api/v1/users</div>
            </div>
          </div>
        </div>

        {/* Hierarchy Definitions */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '32px'
        }}
        >
          {hierarchyLevels.map(({ name, color, desc }) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '12px 0',
                borderBottom: `1px solid ${theme.border.border0}`
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: color,
                flexShrink: 0,
                border: `1px solid ${theme.border.border1}`
              }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{name}</div>
                <div style={{ fontSize: '13px', opacity: 0.6 }}>{desc}</div>
              </div>
              <code style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                opacity: 0.4,
                flexShrink: 0
              }}
              >
                {color}
              </code>
            </div>
          ))}
        </div>
      </Section>

      {/* Semantic Colors */}
      <Section title="Semantic Colors">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '24px'
        }}
        >
          {semanticColors.map(({ name, color, desc, example }) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '12px 0',
                borderBottom: `1px solid ${theme.border.border0}`
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: color,
                flexShrink: 0,
                border: `1px solid ${theme.border.border1}`
              }}
              />
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '12px',
                  marginBottom: '4px'
                }}
                >
                  <span style={{ fontSize: '15px', fontWeight: 600 }}>{name}</span>
                  <span style={{ fontSize: '12px', opacity: 0.4 }}>{example}</span>
                </div>
                <div style={{ fontSize: '13px', opacity: 0.6 }}>{desc}</div>
              </div>
              <code style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                opacity: 0.4,
                flexShrink: 0
              }}
              >
                {color}
              </code>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

export const BordersAndOverlaysRender = () => {
  const theme = useTheme();

  const overlays = [
    { name: 'Overlay0', color: theme.overlay.overlay0, purpose: 'Subtle', desc: 'Light dimming, gentle hover states' },
    { name: 'Overlay1', color: theme.overlay.overlay1, purpose: 'Medium', desc: 'Standard overlays, dropdown backdrops' },
    { name: 'Overlay2', color: theme.overlay.overlay2, purpose: 'Strong', desc: 'Modal backdrops, disabled content' }
  ];

  const radii = [
    { name: 'sm', value: theme.border.radius.sm },
    { name: 'base', value: theme.border.radius.base },
    { name: 'md', value: theme.border.radius.md },
    { name: 'lg', value: theme.border.radius.lg },
    { name: 'xl', value: theme.border.radius.xl }
  ];

  return (
    <div style={{
      padding: '32px',
      backgroundColor: theme.bg,
      color: theme.text,
      minHeight: '100vh'
    }}
    >
      {/* Hero */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px' }}>
          Borders & Overlays
        </h1>
        <p style={{
          fontSize: '16px',
          opacity: 0.7,
          maxWidth: '540px',
          lineHeight: 1.7
        }}
        >
          Borders define boundaries and create structure. Overlays add depth for focus states and modal backdrops.
        </p>
      </div>

      <Section title="Border Hierarchy">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', marginTop: '24px' }}>
          <div style={{
            padding: '16px',
            border: `1px solid ${theme.border.border0}`,
            borderRadius: '8px'
          }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600 }}>border0 (Subtle)</div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>Gentle separations, card outlines</div>
          </div>

          <div style={{
            padding: '16px',
            border: `1px solid ${theme.border.border1}`,
            borderRadius: '8px'
          }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600 }}>border1 (Default)</div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>Standard dividers, input borders</div>
          </div>

          <div style={{
            padding: '16px',
            border: `1px solid ${theme.border.border2}`,
            borderRadius: '8px'
          }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600 }}>border2 (Prominent)</div>
            <div style={{ fontSize: '12px', opacity: 0.6 }}>Focus states, selected items</div>
          </div>
        </div>
      </Section>

      <Section title="Overlay Colors">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '24px'
        }}
        >
          {overlays.map(({ name, color, purpose, desc }) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '12px 0',
                borderBottom: `1px solid ${theme.border.border0}`
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: color,
                flexShrink: 0,
                border: `1px solid ${theme.border.border1}`
              }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{purpose}</div>
                <div style={{ fontSize: '13px', opacity: 0.6 }}>{desc}</div>
              </div>
              <code style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                opacity: 0.4,
                flexShrink: 0
              }}
              >
                {color}
              </code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Border Colors">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '24px'
        }}
        >
          {[
            { name: 'border0', color: theme.border.border0, desc: 'Subtle separations, card outlines' },
            { name: 'border1', color: theme.border.border1, desc: 'Standard dividers, input borders' },
            { name: 'border2', color: theme.border.border2, desc: 'Focus states, selected items' }
          ].map(({ name, color, desc }) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '12px 0',
                borderBottom: `1px solid ${theme.border.border0}`
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: color,
                flexShrink: 0,
                border: `1px solid ${theme.border.border1}`
              }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{name}</div>
                <div style={{ fontSize: '13px', opacity: 0.6 }}>{desc}</div>
              </div>
              <code style={{
                fontSize: '11px',
                fontFamily: 'monospace',
                opacity: 0.4,
                flexShrink: 0
              }}
              >
                {color}
              </code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Border Radius">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginTop: '24px'
        }}
        >
          {radii.map(({ name, value }) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                padding: '12px 0',
                borderBottom: `1px solid ${theme.border.border0}`
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: value,
                flexShrink: 0,
                border: `2px solid ${theme.primary?.text || theme.brand}`
              }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '15px', fontWeight: 600 }}>{name}</span>
              </div>
              <code style={{ fontSize: '12px', fontFamily: 'monospace', opacity: 0.4 }}>{value}</code>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

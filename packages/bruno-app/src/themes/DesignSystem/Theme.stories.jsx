import React from 'react';
import { useTheme } from 'styled-components';
import { palette as darkPalette } from '../dark/dark';
import { palette as lightPalette } from '../light/light';
import { ColorSection } from '../PaletteViewer/components';

export default {
  title: 'Design System/Theme',
  parameters: {
    layout: 'padded'
  }
};

export const Palette = {
  render: () => {
    const theme = useTheme();
    const isDark = theme.mode === 'dark';
    const palette = isDark ? darkPalette : lightPalette;

    return (
      <div style={{ padding: '24px', backgroundColor: theme.bg, minHeight: '100vh' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px', color: theme.text }}>
            Palette
          </h1>
          <p style={{
            fontSize: '16px',
            opacity: 0.7,
            maxWidth: '540px',
            lineHeight: 1.7,
            color: theme.text
          }}
          >
            The foundational color tokens that make up the {isDark ? 'dark' : 'light'} theme. All semantic colors are derived from these base values.
          </p>
        </div>

        <ColorSection title="Primary" colors={palette.primary} textColor={theme.text} size={48} />
        <ColorSection title="Hues" colors={palette.hues} textColor={theme.text} size={48} />
        <ColorSection title="System" colors={palette.system} textColor={theme.text} size={48} />
        <ColorSection title="Background" colors={palette.background} textColor={theme.text} size={48} />
        <ColorSection title="Text" colors={palette.text} textColor={theme.text} size={48} />
        <ColorSection title="Overlay" colors={palette.overlay} textColor={theme.text} size={48} />
        <ColorSection title="Border" colors={palette.border} textColor={theme.text} size={48} />
        <ColorSection title="Utility" colors={palette.utility} textColor={theme.text} size={48} />
      </div>
    );
  }
};

export const IntentAndSyntax = {
  render: () => {
    const theme = useTheme();
    const isDark = theme.mode === 'dark';
    const palette = isDark ? darkPalette : lightPalette;

    return (
      <div style={{ padding: '24px', backgroundColor: theme.bg, minHeight: '100vh' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px', color: theme.text }}>
            Intent & Syntax
          </h1>
          <p style={{
            fontSize: '16px',
            opacity: 0.7,
            maxWidth: '540px',
            lineHeight: 1.7,
            color: theme.text
          }}
          >
            Semantic color mappings derived from the base palette. Intent colors convey meaning, while syntax colors provide code highlighting.
          </p>
        </div>

        <ColorSection title="Intent" colors={palette.intent} textColor={theme.text} size={48} />
        <ColorSection title="Syntax" colors={palette.syntax} textColor={theme.text} size={48} />
      </div>
    );
  }
};

export const HueWheel = {
  render: () => {
    const theme = useTheme();
    const isDark = theme.mode === 'dark';
    const palette = isDark ? darkPalette : lightPalette;

    const hues = Object.entries(palette.hues);
    // Sort by hue for visualization
    const sorted = [...hues].sort((a, b) => {
      const hueA = parseInt(a[1].match(/hsl\((\d+)/)?.[1] || 0);
      const hueB = parseInt(b[1].match(/hsl\((\d+)/)?.[1] || 0);
      return hueA - hueB;
    });

    return (
      <div style={{ padding: '24px', backgroundColor: theme.bg, minHeight: '100vh' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px', color: theme.text }}>
            Hue Wheel
          </h1>
          <p style={{
            fontSize: '16px',
            opacity: 0.7,
            maxWidth: '540px',
            lineHeight: 1.7,
            color: theme.text
          }}
          >
            Distribution of the 14 hue colors across the color wheel (0° to 360°). Provides full spectrum coverage for diverse UI needs.
          </p>
        </div>

        {/* Visual wheel representation */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '48px'
        }}
        >
          <div style={{
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: `conic-gradient(${sorted.map(([, color], i) => `${color} ${(i / sorted.length) * 100}% ${((i + 1) / sorted.length) * 100}%`).join(', ')})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          >
            <div style={{
              width: '140px',
              height: '140px',
              borderRadius: '50%',
              backgroundColor: theme.bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column'
            }}
            >
              <div style={{ fontSize: '24px', fontWeight: 700, color: theme.text }}>14</div>
              <div style={{ fontSize: '12px', opacity: 0.6, color: theme.text }}>hues</div>
            </div>
          </div>
        </div>

        {/* Hue distribution bars */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}
        >
          {sorted.map(([name, color]) => {
            const hueMatch = color.match(/hsl\((\d+)/);
            const hue = hueMatch ? parseInt(hueMatch[1]) : 0;
            return (
              <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '70px', fontSize: '12px', fontWeight: 600, color: theme.text }}>{name}</div>
                <div style={{ width: '40px', fontSize: '11px', opacity: 0.5, fontFamily: 'monospace', color: theme.text }}>{hue}°</div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: `${(hue / 360) * 100}%`,
                      minWidth: '20px',
                      height: '28px',
                      backgroundColor: color,
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <code style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  opacity: 0.4,
                  width: '140px',
                  color: theme.text
                }}
                >
                  {color}
                </code>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
};

// Helper to parse HSL values
const parseHSL = (hslString) => {
  const match = hslString.match(/hsl\(\s*(\d+)\s*,?\s*(\d+)%?\s*,?\s*(\d+)%?\s*\)/);
  if (match) {
    return {
      h: parseInt(match[1]),
      s: parseInt(match[2]),
      l: parseInt(match[3])
    };
  }
  return null;
};

// Calculate statistics
const calcStats = (values) => {
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  return { mean, stdDev, min, max, range };
};

export const HueAnalysis = {
  render: () => {
    const theme = useTheme();
    const isDark = theme.mode === 'dark';
    const palette = isDark ? darkPalette : lightPalette;

    const hues = Object.entries(palette.hues).map(([name, color]) => ({
      name,
      color,
      ...parseHSL(color)
    })).filter((h) => h.h !== null);

    const saturations = hues.map((h) => h.s);
    const lightnesses = hues.map((h) => h.l);

    const satStats = calcStats(saturations);
    const lightStats = calcStats(lightnesses);

    const StatCard = ({ title, stats, unit = '%', values, hueData }) => (
      <div style={{
        padding: '20px',
        backgroundColor: theme.background.surface0,
        borderRadius: '12px',
        border: `1px solid ${theme.border.border0}`,
        marginBottom: '24px'
      }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: theme.text }}>{title}</h3>

        {/* Stats grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '12px',
          marginBottom: '20px'
        }}
        >
          {[
            { label: 'Mean', value: stats.mean.toFixed(1) },
            { label: 'Std Dev', value: stats.stdDev.toFixed(1) },
            { label: 'Min', value: stats.min },
            { label: 'Max', value: stats.max },
            { label: 'Range', value: stats.range }
          ].map(({ label, value }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: theme.text }}>{value}{unit}</div>
              <div style={{ fontSize: '11px', opacity: 0.5, color: theme.text }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Distribution visualization */}
        <div style={{ marginTop: '16px' }}>
          <div style={{ fontSize: '12px', opacity: 0.5, marginBottom: '8px', color: theme.text }}>Distribution</div>
          <div style={{
            position: 'relative',
            height: '60px',
            backgroundColor: theme.background.surface1,
            borderRadius: '6px',
            overflow: 'hidden'
          }}
          >
            {/* Mean line */}
            <div style={{
              position: 'absolute',
              left: `${stats.mean}%`,
              top: 0,
              bottom: 0,
              width: '2px',
              backgroundColor: theme.primary?.strong || theme.brand,
              zIndex: 2
            }}
            />
            {/* Std dev range */}
            <div style={{
              position: 'absolute',
              left: `${Math.max(0, stats.mean - stats.stdDev)}%`,
              width: `${Math.min(100, stats.stdDev * 2)}%`,
              top: '15px',
              bottom: '15px',
              backgroundColor: theme.primary?.subtle || theme.brand,
              opacity: 0.3,
              borderRadius: '4px'
            }}
            />
            {/* Individual values */}
            {hueData.map((h, i) => (
              <div
                key={h.name}
                title={`${h.name}: ${values[i]}%`}
                style={{
                  position: 'absolute',
                  left: `${values[i]}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: h.color,
                  border: `2px solid ${theme.bg}`,
                  zIndex: 1
                }}
              />
            ))}
          </div>
          {/* Scale */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
            <span style={{ fontSize: '10px', opacity: 0.4, color: theme.text }}>0%</span>
            <span style={{ fontSize: '10px', opacity: 0.4, color: theme.text }}>50%</span>
            <span style={{ fontSize: '10px', opacity: 0.4, color: theme.text }}>100%</span>
          </div>
        </div>
      </div>
    );

    return (
      <div style={{ padding: '24px', backgroundColor: theme.bg, minHeight: '100vh' }}>
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '12px', color: theme.text }}>
            Hue Analysis
          </h1>
          <p style={{
            fontSize: '16px',
            opacity: 0.7,
            maxWidth: '540px',
            lineHeight: 1.7,
            color: theme.text
          }}
          >
            Statistical analysis of saturation and lightness consistency across the 14 hue colors. Lower standard deviation indicates more uniform values.
          </p>
        </div>

        <StatCard
          title="Saturation Distribution"
          stats={satStats}
          values={saturations}
          hueData={hues}
        />

        <StatCard
          title="Lightness Distribution"
          stats={lightStats}
          values={lightnesses}
          hueData={hues}
        />

        {/* Saturation Breakdown */}
        <div style={{
          padding: '20px',
          backgroundColor: theme.background.surface0,
          borderRadius: '12px',
          border: `1px solid ${theme.border.border0}`,
          marginBottom: '24px'
        }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: theme.text }}>
            Saturation by Hue
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {hues.map((h) => {
              const diff = h.s - satStats.mean;
              const isOutlier = Math.abs(diff) > satStats.stdDev;
              return (
                <div
                  key={h.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{ width: '70px', fontSize: '12px', fontWeight: 500, color: theme.text }}>{h.name}</div>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    backgroundColor: h.color,
                    flexShrink: 0
                  }}
                  />
                  <div style={{ flex: 1, position: 'relative', height: '24px' }}>
                    {/* Background track */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      left: 0,
                      right: 0,
                      height: '8px',
                      backgroundColor: theme.background.surface1,
                      borderRadius: '4px'
                    }}
                    />
                    {/* Mean line */}
                    <div style={{
                      position: 'absolute',
                      left: `${satStats.mean}%`,
                      top: '2px',
                      bottom: '2px',
                      width: '2px',
                      backgroundColor: theme.primary?.subtle || theme.brand,
                      opacity: 0.5,
                      borderRadius: '1px'
                    }}
                    />
                    {/* Value bar */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      left: 0,
                      width: `${h.s}%`,
                      height: '8px',
                      backgroundColor: h.color,
                      borderRadius: '4px'
                    }}
                    />
                  </div>
                  <div style={{
                    width: '70px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    textAlign: 'right',
                    color: isOutlier ? palette.hues.ORANGE : theme.text
                  }}
                  >
                    {h.s}%
                    <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: '2px' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px', opacity: 0.4, color: theme.text }}>
            Mean line shown at {satStats.mean.toFixed(0)}% · Outliers ({'>'} 1σ) highlighted
          </div>
        </div>

        {/* Lightness Breakdown */}
        <div style={{
          padding: '20px',
          backgroundColor: theme.background.surface0,
          borderRadius: '12px',
          border: `1px solid ${theme.border.border0}`
        }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: theme.text }}>
            Lightness by Hue
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {hues.map((h) => {
              const diff = h.l - lightStats.mean;
              const isOutlier = Math.abs(diff) > lightStats.stdDev;
              return (
                <div
                  key={h.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div style={{ width: '70px', fontSize: '12px', fontWeight: 500, color: theme.text }}>{h.name}</div>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    backgroundColor: h.color,
                    flexShrink: 0
                  }}
                  />
                  <div style={{ flex: 1, position: 'relative', height: '24px' }}>
                    {/* Background track */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      left: 0,
                      right: 0,
                      height: '8px',
                      backgroundColor: theme.background.surface1,
                      borderRadius: '4px'
                    }}
                    />
                    {/* Mean line */}
                    <div style={{
                      position: 'absolute',
                      left: `${lightStats.mean}%`,
                      top: '2px',
                      bottom: '2px',
                      width: '2px',
                      backgroundColor: theme.primary?.subtle || theme.brand,
                      opacity: 0.5,
                      borderRadius: '1px'
                    }}
                    />
                    {/* Value bar */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      left: 0,
                      width: `${h.l}%`,
                      height: '8px',
                      backgroundColor: h.color,
                      borderRadius: '4px'
                    }}
                    />
                  </div>
                  <div style={{
                    width: '70px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    textAlign: 'right',
                    color: isOutlier ? palette.hues.ORANGE : theme.text
                  }}
                  >
                    {h.l}%
                    <span style={{ fontSize: '10px', opacity: 0.5, marginLeft: '2px' }}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px', opacity: 0.4, color: theme.text }}>
            Mean line shown at {lightStats.mean.toFixed(0)}% · Outliers ({'>'} 1σ) highlighted
          </div>
        </div>
      </div>
    );
  }
};

import React from 'react';
import { useTheme } from 'styled-components';

export default {
  title: 'Foundations/Tokens',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Design tokens from the active theme. Switch the theme in the toolbar to '
          + 'see how the tokens change across Bruno\'s themes.'
      }
    }
  }
};

const Row = ({ children }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{children}</div>
);

const Card = ({ children }) => <div style={{ minWidth: 150 }}>{children}</div>;

const Meta = ({ name, value }) => (
  <div style={{ marginTop: 6 }}>
    <div style={{ fontWeight: 500, fontSize: 13 }}>{name}</div>
    <code style={{ fontSize: 12, opacity: 0.7 }}>{String(value)}</code>
  </div>
);

export const Colors = {
  render: () => {
    const theme = useTheme();
    const swatches = [
      ['brand', theme.brand],
      ['text', theme.text],
      ['bg', theme.bg],
      ...Object.entries(theme.background || {}).map(([k, v]) => [`background.${k}`, v])
    ];
    return (
      <Row>
        {swatches.map(([name, value]) => (
          <Card key={name}>
            <div style={{ height: 56, borderRadius: 8, background: value, border: '1px solid rgba(0,0,0,0.12)' }} />
            <Meta name={name} value={value} />
          </Card>
        ))}
      </Row>
    );
  }
};

export const Typography = {
  render: () => {
    const theme = useTheme();
    return (
      <div>
        {Object.entries(theme.font?.size || {}).map(([k, v]) => (
          <div key={k} style={{ fontSize: v, marginBottom: 10, color: theme.text }}>
            <code style={{ fontSize: 12, opacity: 0.6, marginRight: 8 }}>font.size.{k} ({String(v)})</code>
            The quick brown fox jumps over the lazy dog
          </div>
        ))}
      </div>
    );
  }
};

export const Radii = {
  render: () => {
    const theme = useTheme();
    return (
      <Row>
        {Object.entries(theme.border?.radius || {}).map(([k, v]) => (
          <Card key={k}>
            <div style={{ height: 56, width: 56, borderRadius: v, background: theme.brand }} />
            <Meta name={`border.radius.${k}`} value={v} />
          </Card>
        ))}
      </Row>
    );
  }
};

export const Shadows = {
  render: () => {
    const theme = useTheme();
    return (
      <Row>
        {Object.entries(theme.shadow || {}).map(([k, v]) => (
          <Card key={k}>
            <div style={{ height: 56, width: 56, borderRadius: 8, background: theme.bg || '#fff', boxShadow: v }} />
            <Meta name={`shadow.${k}`} value={v} />
          </Card>
        ))}
      </Row>
    );
  }
};

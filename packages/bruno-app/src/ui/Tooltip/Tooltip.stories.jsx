import React from 'react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import Tooltip from './index';

export default {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered'
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'rich'],
      description: 'Visual variant; both invert `theme.text` and `theme.bg`, rich adds padding, link and inline-code styles'
    },
    content: { control: 'text', description: 'Tooltip body' },
    shortcut: { control: 'text', description: 'Keyboard shortcut shown muted after the content' },
    place: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right', 'top-start', 'top-end', 'bottom-start', 'bottom-end'],
      description: 'Placement relative to the anchor'
    },
    maxWidth: { control: 'text', description: 'CSS max-width (default 240px, rich 320px)' }
  }
};

const Anchor = ({ children }) => (
  <button type="button" style={{ padding: '4px 10px', border: '1px solid currentColor', borderRadius: 4 }}>
    {children}
  </button>
);

export const Default = {
  render: (args) => (
    <Tooltip {...args}>
      <Anchor>Hover me</Anchor>
    </Tooltip>
  ),
  args: {
    content: 'Save',
    shortcut: 'Cmd + S',
    variant: 'default',
    place: 'top'
  }
};

const VARIANTS = [
  { variant: 'default', content: 'Save', shortcut: 'Cmd + S' },
  {
    variant: 'rich',
    content: (
      <>
        Path variables are added whenever the <code>:name</code> template is used. <a href="#">Learn more</a>
      </>
    )
  }
];

const VariantRow = ({ themeKey }) => (
  <div style={{ display: 'flex', gap: 220, padding: '72px 24px 24px' }}>
    {VARIANTS.map(({ variant, content, shortcut }) => (
      <Tooltip key={variant} isOpen variant={variant} content={content} shortcut={shortcut} anchorId={`${themeKey}-${variant}`}>
        <Anchor>{variant}</Anchor>
      </Tooltip>
    ))}
  </div>
);

export const Variants = {
  render: () => <VariantRow themeKey="current" />
};

export const AllThemes = {
  parameters: { layout: 'padded' },
  render: () => (
    <div>
      {Object.entries(themes).map(([key, theme]) => (
        <ThemeProvider key={key} theme={theme}>
          <section style={{ background: theme.bg, color: theme.text }}>
            <h3 style={{ padding: '12px 24px 0', fontWeight: 600 }}>{key}</h3>
            <VariantRow themeKey={key} />
          </section>
        </ThemeProvider>
      ))}
    </div>
  )
};

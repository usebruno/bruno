import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';

global.React = React;

jest.mock('utils/common/platform', () => ({
  getPlatformModifierKey: jest.fn(() => 'Ctrl')
}));

import { getPlatformModifierKey } from 'utils/common/platform';
import AutocompletePane from './AutocompletePane';

const theme = {
  primary: { solid: '#6366f1' },
  input: { bg: '#111827' },
  colors: { text: { muted: '#9ca3af' } }
};

const baseProps = {
  aiEnabled: true,
  enabled: true,
  model: '',
  triggerMode: 'manual',
  availableModels: [{ id: 'model-1', label: 'Model 1' }],
  hasConfiguredProvider: true,
  onToggleEnabled: jest.fn(),
  onChangeModel: jest.fn(),
  onChangeTriggerMode: jest.fn()
};

const renderPane = (modifier, props = {}) => {
  getPlatformModifierKey.mockReturnValue(modifier);
  return render(
    <ThemeProvider theme={theme}>
      <AutocompletePane {...baseProps} {...props} />
    </ThemeProvider>
  );
};

describe('AutocompletePane shortcut copy', () => {
  it.each([
    ['macOS', '⌘'],
    ['non-macOS', 'Ctrl']
  ])('shows the %s modifier in the keymap', (_platform, modifier) => {
    renderPane(modifier);
    expect(screen.getAllByText(modifier).length).toBeGreaterThan(0);
  });

  it('shows the platform modifier in the manual trigger description', () => {
    renderPane('Ctrl');
    expect(screen.getByText('Only on Ctrl+\\')).toBeInTheDocument();
  });
});

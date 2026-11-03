import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import SettingsField from './index';

const theme = {
  text: '#343434',
  font: { size: { base: '0.8125rem', xs: '0.6875rem' } },
  colors: { text: { muted: '#838383', danger: '#d32f2f' } }
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('SettingsField', () => {
  it('renders a real <label> tied to the control when htmlFor is given', () => {
    renderWithTheme(
      <SettingsField label="Hostname" htmlFor="host">
        <input id="host" />
      </SettingsField>
    );
    expect(screen.getByLabelText('Hostname')).toHaveAttribute('id', 'host');
  });

  it('renders the label as a span with labelId when there is no htmlFor', () => {
    renderWithTheme(
      <SettingsField label="Protocol" labelId="protocol-label">
        <button type="button" aria-labelledby="protocol-label">HTTP</button>
      </SettingsField>
    );
    const label = screen.getByText('Protocol');
    expect(label.tagName).toBe('SPAN');
    expect(screen.getByRole('button', { name: 'Protocol' })).toBeInTheDocument();
  });

  it('gives the description an id the control can use as its accessible description', () => {
    renderWithTheme(
      <SettingsField label="Proxy Bypass" description="Separate hosts with commas" htmlFor="bypass" descriptionId="bypass-description">
        <input id="bypass" aria-describedby="bypass-description" />
      </SettingsField>
    );
    expect(screen.getByLabelText('Proxy Bypass')).toHaveAccessibleDescription('Separate hosts with commas');
  });

  it('shows the description and the error', () => {
    renderWithTheme(
      <SettingsField label="Port" description="Proxy port" error="Specify port between 1 and 65535" htmlFor="port">
        <input id="port" />
      </SettingsField>
    );
    expect(screen.getByText('Proxy port')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Specify port between 1 and 65535');
  });

  it('applies the layout class (stacked by default, inline when asked)', () => {
    const { container, rerender } = renderWithTheme(
      <SettingsField label="A" htmlFor="a"><input id="a" /></SettingsField>
    );
    expect(container.firstChild).toHaveClass('settings-field--stacked');

    rerender(
      <ThemeProvider theme={theme}>
        <SettingsField layout="inline" label="A" htmlFor="a"><input id="a" /></SettingsField>
      </ThemeProvider>
    );
    expect(container.firstChild).toHaveClass('settings-field--inline');

    rerender(
      <ThemeProvider theme={theme}>
        <SettingsField layout="leading" label="A" htmlFor="a"><input id="a" type="checkbox" /></SettingsField>
      </ThemeProvider>
    );
    expect(container.firstChild).toHaveClass('settings-field--leading');
  });

  it('leading layout: clicking the label toggles the checkbox', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <SettingsField layout="leading" label="Proxy authentication" description="Send credentials" htmlFor="auth">
        <input id="auth" type="checkbox" />
      </SettingsField>
    );
    const checkbox = screen.getByLabelText('Proxy authentication');
    expect(checkbox).not.toBeChecked();
    await user.click(screen.getByText('Proxy authentication'));
    expect(checkbox).toBeChecked();
  });
});

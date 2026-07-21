import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import ToggleSwitch from './index';

// Minimal theme with only the tokens ToggleSwitch's StyledWrapper reads.
const theme = {
  primary: { solid: '#546de5' },
  input: { bg: '#ffffff' },
  colors: { text: { muted: '#9b9b9b' } }
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('ToggleSwitch', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders a checkbox that is checked when on', () => {
    renderWithTheme(<ToggleSwitch isOn handleToggle={() => {}} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('is unchecked when off', () => {
    renderWithTheme(<ToggleSwitch isOn={false} handleToggle={() => {}} />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('calls handleToggle when toggled', async () => {
    const handleToggle = jest.fn();
    renderWithTheme(<ToggleSwitch isOn={false} handleToggle={handleToggle} />);

    await user.click(screen.getByRole('checkbox'));

    expect(handleToggle).toHaveBeenCalledTimes(1);
  });

  it('updates when driven as a controlled component', async () => {
    const Controlled = () => {
      const [isOn, setIsOn] = useState(false);
      return <ToggleSwitch isOn={isOn} handleToggle={() => setIsOn((v) => !v)} />;
    };
    renderWithTheme(<Controlled />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('renders at a non-default size', () => {
    renderWithTheme(<ToggleSwitch size="l" isOn handleToggle={() => {}} />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });
});

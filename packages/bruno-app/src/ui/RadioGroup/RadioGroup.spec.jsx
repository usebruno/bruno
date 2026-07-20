import '@testing-library/jest-dom';
import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import RadioGroup, { Radio } from './index';

// Minimal theme with only the tokens RadioGroup's StyledWrapper reads.
// `brand` must be a valid color — polished's transparentize() throws otherwise.
const theme = {
  text: '#343434',
  brand: 'hsl(33, 80%, 46%)',
  input: { border: '#cccccc' },
  colors: { text: { muted: '#9b9b9b' } },
  font: { size: { xs: '0.6875rem', sm: '0.75rem', base: '0.8125rem' } }
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const Options = () => (
  <>
    <Radio value="off" label="Off" />
    <Radio value="manual" label="Manual" />
    <Radio value="system" label="System" />
  </>
);

// Render a RadioGroup with sensible defaults; override via `props`, and pass
// custom `children` when a test needs specific options.
const renderRadioGroup = (props = {}, children = <Options />) =>
  renderWithTheme(
    <RadioGroup name="mode" ariaLabel="Mode" value="off" onChange={() => {}} {...props}>
      {children}
    </RadioGroup>
  );

describe('RadioGroup', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders all options inside a radiogroup', () => {
    renderRadioGroup();

    expect(screen.getByRole('radiogroup', { name: 'Mode' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(3);
  });

  it('reflects the selected value as checked', () => {
    renderRadioGroup({ value: 'manual' });

    expect(screen.getByRole('radio', { name: 'Manual' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Off' })).not.toBeChecked();
  });

  it('calls onChange with the value (and event) when an option is selected', async () => {
    const onChange = jest.fn();
    renderRadioGroup({ onChange });

    await user.click(screen.getByRole('radio', { name: 'System' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toBe('system');
    expect(onChange.mock.calls[0][1]).toHaveProperty('target');
  });

  it('updates selection when driven as a controlled component', async () => {
    const Controlled = () => {
      const [value, setValue] = useState('off');
      return (
        <RadioGroup name="mode" ariaLabel="Mode" value={value} onChange={setValue}>
          <Options />
        </RadioGroup>
      );
    };
    renderWithTheme(<Controlled />);

    await user.click(screen.getByRole('radio', { name: 'Manual' }));

    expect(screen.getByRole('radio', { name: 'Manual' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Off' })).not.toBeChecked();
  });

  it('does not fire onChange when the whole group is disabled', async () => {
    const onChange = jest.fn();
    renderRadioGroup({ onChange, disabled: true });

    const manual = screen.getByRole('radio', { name: 'Manual' });
    expect(manual).toBeDisabled();
    await user.click(manual);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('disables only the option marked disabled', async () => {
    const onChange = jest.fn();
    renderRadioGroup(
      { onChange },
      <>
        <Radio value="off" label="Off" />
        <Radio value="manual" label="Manual" disabled />
      </>
    );

    expect(screen.getByRole('radio', { name: 'Manual' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Off' })).toBeEnabled();
    await user.click(screen.getByRole('radio', { name: 'Manual' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shares a single generated name across inputs when none is provided', () => {
    renderRadioGroup({ name: undefined });

    const [a, b, c] = screen.getAllByRole('radio');
    expect(a.name).toBeTruthy();
    expect(a.name).toBe(b.name);
    expect(b.name).toBe(c.name);
  });

  it('applies dataTestId to the underlying input', () => {
    renderRadioGroup({}, <Radio value="off" label="Off" dataTestId="mode-off" />);

    expect(screen.getByTestId('mode-off')).toBe(screen.getByRole('radio', { name: 'Off' }));
  });

  it('applies dataTestId to the group container', () => {
    renderRadioGroup({ dataTestId: 'mode-group' });

    expect(screen.getByTestId('mode-group')).toBe(screen.getByRole('radiogroup'));
  });

  it('forwards additional props to the radiogroup container', () => {
    renderRadioGroup({ 'data-custom': 'xyz' });

    expect(screen.getByRole('radiogroup')).toHaveAttribute('data-custom', 'xyz');
  });

  describe('accessible name', () => {
    it('is derived from a visible label', () => {
      renderRadioGroup({ label: 'Proxy mode', ariaLabel: undefined });
      expect(screen.getByRole('radiogroup', { name: 'Proxy mode' })).toBeInTheDocument();
    });

    it('is derived from ariaLabel when no visible label is rendered', () => {
      renderRadioGroup({ ariaLabel: 'Proxy mode' });
      expect(screen.getByRole('radiogroup', { name: 'Proxy mode' })).toBeInTheDocument();
    });

    it('is derived from an external element via ariaLabelledBy', () => {
      renderWithTheme(
        <>
          <span id="ext-label">Proxy mode</span>
          <RadioGroup name="mode" ariaLabelledBy="ext-label" value="off" onChange={() => {}}>
            <Options />
          </RadioGroup>
        </>
      );
      expect(screen.getByRole('radiogroup', { name: 'Proxy mode' })).toBeInTheDocument();
    });
  });

  it('throws if Radio is used outside a RadioGroup', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderWithTheme(<Radio value="x" label="X" />)).toThrow(
      '<Radio> must be rendered inside <RadioGroup>.'
    );
    spy.mockRestore();
  });
});

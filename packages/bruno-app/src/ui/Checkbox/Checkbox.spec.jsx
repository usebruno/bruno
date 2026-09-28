import '@testing-library/jest-dom';
import React, { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import Checkbox from './index';

const theme = {
  mode: 'light',
  text: '#343434',
  border: { border3: '#B1B1B1' },
  primary: { solid: '#D37F17' },
  button2: { color: { primary: { text: '#ffffff' } } },
  font: { size: { sm: '0.75rem' } }
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

const renderCheckbox = (props = {}) => {
  const hasAccessibleName = 'label' in props || 'ariaLabel' in props || 'ariaLabelledBy' in props;
  return renderWithTheme(
    <Checkbox onChange={() => {}} {...(hasAccessibleName ? {} : { ariaLabel: 'Checkbox' })} {...props} />
  );
};

describe('Checkbox', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders unchecked by default', () => {
    renderCheckbox();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('reflects the checked prop', () => {
    renderCheckbox({ checked: true });
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('calls onChange when clicked', async () => {
    const onChange = jest.fn();
    renderCheckbox({ onChange });

    await user.click(screen.getByRole('checkbox'));

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not call onChange when disabled', async () => {
    const onChange = jest.fn();
    renderCheckbox({ onChange, disabled: true });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
    await user.click(checkbox);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('updates when driven as a controlled component', async () => {
    const Controlled = () => {
      const [checked, setChecked] = useState(false);
      return <Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />;
    };
    renderWithTheme(<Controlled />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('renders the optional label and associates it with the input', () => {
    renderCheckbox({ label: 'Accept terms' });

    expect(screen.getByText('Accept terms')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeInTheDocument();
  });

  it('toggles via keyboard (space)', async () => {
    const onChange = jest.fn();
    renderCheckbox({ onChange });

    const checkbox = screen.getByRole('checkbox');
    checkbox.focus();
    await user.keyboard(' ');

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('applies the data-testid to the input', () => {
    renderCheckbox({ 'data-testid': 'my-checkbox' });
    expect(screen.getByTestId('my-checkbox')).toBe(screen.getByRole('checkbox'));
  });

  it('forwards the ref to the input element', () => {
    const ref = createRef();
    renderCheckbox({ ref });

    expect(ref.current).toBe(screen.getByRole('checkbox'));
  });

  it('forwards additional props to the input', () => {
    renderCheckbox({ required: true, name: 'terms' });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeRequired();
    expect(checkbox).toHaveAttribute('name', 'terms');
  });

  describe('indeterminate', () => {
    it('sets the DOM indeterminate property when the prop is true', () => {
      renderCheckbox({ indeterminate: true });
      expect(screen.getByRole('checkbox').indeterminate).toBe(true);
    });

    it('does not set the DOM indeterminate property by default', () => {
      renderCheckbox();
      expect(screen.getByRole('checkbox').indeterminate).toBe(false);
    });

    it('clears the DOM indeterminate property when the prop turns false', () => {
      const { rerender } = renderCheckbox({ indeterminate: true });
      expect(screen.getByRole('checkbox').indeterminate).toBe(true);

      rerender(
        <ThemeProvider theme={theme}>
          <Checkbox onChange={() => {}} ariaLabel="Checkbox" indeterminate={false} />
        </ThemeProvider>
      );

      expect(screen.getByRole('checkbox').indeterminate).toBe(false);
    });

    it('re-applies the DOM property on re-render even though the browser clears it on click', async () => {
      const onChange = jest.fn();
      const { rerender } = renderCheckbox({ indeterminate: true, onChange });

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      // Clicking a native checkbox always resets `indeterminate` to false in the browser,
      // regardless of what the app does with the click. This is the behavior our effect
      // (re-applied on every render, no dependency array) must correct for.
      checkbox.indeterminate = false;

      rerender(
        <ThemeProvider theme={theme}>
          <Checkbox onChange={onChange} ariaLabel="Checkbox" indeterminate={true} />
        </ThemeProvider>
      );

      expect(checkbox.indeterminate).toBe(true);
    });

    it('re-asserts the DOM property from the change handler even when the click causes no rerender', async () => {
      const onChange = jest.fn();
      renderCheckbox({ indeterminate: true, onChange });

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox.indeterminate).toBe(true);

      checkbox.indeterminate = false;
      await user.click(checkbox);

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(checkbox.indeterminate).toBe(true);
    });

    it('still forwards the ref to the input element when indeterminate', () => {
      const ref = createRef();
      renderCheckbox({ indeterminate: true, ref });

      expect(ref.current).toBe(screen.getByRole('checkbox'));
      expect(ref.current.indeterminate).toBe(true);
    });
  });

  describe('accessible name', () => {
    it('is derived from ariaLabel when there is no visible label', () => {
      renderCheckbox({ ariaLabel: 'Select all' });
      expect(screen.getByRole('checkbox', { name: 'Select all' })).toBeInTheDocument();
    });

    it('is derived from an external element via ariaLabelledBy', () => {
      renderWithTheme(
        <>
          <span id="ext-label">Select all</span>
          <Checkbox onChange={() => {}} ariaLabelledBy="ext-label" />
        </>
      );
      expect(screen.getByRole('checkbox', { name: 'Select all' })).toBeInTheDocument();
    });
  });
});

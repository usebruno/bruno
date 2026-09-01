import '@testing-library/jest-dom';
import React, { useState, createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'styled-components';
import Input from './index';
import Field from '../Field';

const theme = {
  mode: 'light',
  text: '#343434',
  input: {
    bg: '#ffffff',
    border: '#cccccc',
    focusBorder: '#343434',
    placeholder: { color: '#b0b0b0', opacity: 0.8 }
  },
  background: { mantle: '#f8f8f8', surface0: '#f1f1f1' },
  status: { danger: { border: '#ce4f3b', text: '#ce4f3b' } },
  colors: { text: { muted: '#9b9b9b' } },
  codemirror: { placeholder: { color: '#b0b0b0', opacity: 0.75 } },
  border: { radius: { sm: '4px', base: '6px' } },
  font: { size: { xs: '0.6875rem', sm: '0.75rem' } }
};

const renderWithTheme = (ui) => render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);

describe('Input', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
  });

  it('renders a textbox and reports typing through onChange', async () => {
    const onChange = jest.fn();
    renderWithTheme(<Input value="" onChange={onChange} placeholder="Collection name" />);

    const input = screen.getByPlaceholderText('Collection name');
    await user.type(input, 'a');

    expect(input).toHaveAttribute('type', 'text');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveProperty('target');
  });

  it('works as a controlled component', async () => {
    const Controlled = () => {
      const [value, setValue] = useState('');
      return <Input value={value} onChange={(e) => setValue(e.target.value)} />;
    };
    renderWithTheme(<Controlled />);

    await user.type(screen.getByRole('textbox'), 'orders');
    expect(screen.getByRole('textbox')).toHaveValue('orders');
  });

  it('forwards the ref to the underlying input element', () => {
    const ref = createRef();
    renderWithTheme(<Input value="" onChange={() => {}} ref={ref} />);

    expect(ref.current).toBe(screen.getByRole('textbox'));
  });

  it('does not accept input when disabled', async () => {
    const onChange = jest.fn();
    renderWithTheme(<Input value="" onChange={onChange} disabled />);

    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
    await user.type(input, 'nope');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('marks itself invalid when error is set, and stays valid otherwise', () => {
    const { unmount } = renderWithTheme(<Input value="" onChange={() => {}} error />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    unmount();

    renderWithTheme(<Input value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('renders leading and trailing sections', () => {
    renderWithTheme(
      <Input
        value=""
        onChange={() => {}}
        leftSection={<span data-testid="left">/</span>}
        rightSection={<span data-testid="right">ms</span>}
      />
    );

    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });

  it('applies a default data-testid that callers can override', () => {
    const { unmount } = renderWithTheme(<Input value="" onChange={() => {}} />);
    expect(screen.getByTestId('input')).toBe(screen.getByRole('textbox'));
    unmount();

    renderWithTheme(<Input value="" onChange={() => {}} data-testid="collection-name" />);
    expect(screen.getByTestId('collection-name')).toBe(screen.getByRole('textbox'));
  });

  it('leaves autocomplete to the caller', () => {
    const { unmount } = renderWithTheme(<Input value="" onChange={() => {}} />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('autocomplete');
    unmount();

    renderWithTheme(<Input value="" onChange={() => {}} autoComplete="username" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'username');
  });

  it('generates an id that is safe to use in a CSS selector', () => {
    renderWithTheme(<Input value="" onChange={() => {}} />);

    const id = screen.getByRole('textbox').getAttribute('id');
    expect(() => document.querySelector(`#${id}`)).not.toThrow();
  });

  it('forwards unknown props to the input', () => {
    renderWithTheme(<Input value="" onChange={() => {}} maxLength={8} name="port" />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('maxlength', '8');
    expect(input).toHaveAttribute('name', 'port');
  });

  describe('visibility toggle', () => {
    const renderPassword = (props = {}) =>
      renderWithTheme(<Input type="password" value="hunter2" onChange={() => {}} withVisibilityToggle {...props} />);

    it('reveals and re-hides the value', async () => {
      renderPassword();

      const toggle = screen.getByRole('button', { name: 'Show value' });
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');

      await user.click(toggle);
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'text');
      expect(screen.getByRole('button', { name: 'Hide value' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Hide value' }));
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');
    });

    it('is reachable and operable by keyboard', async () => {
      renderPassword();

      await user.tab();
      expect(screen.getByTestId('input')).toHaveFocus();
      await user.tab();
      expect(screen.getByRole('button', { name: 'Show value' })).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(screen.getByTestId('input')).toHaveAttribute('type', 'text');
    });

    it('is absent unless the type is password', () => {
      renderWithTheme(<Input value="" onChange={() => {}} withVisibilityToggle />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('inside a Field', () => {
    it('wires the label, helper text and aria-describedby to the input', () => {
      renderWithTheme(
        <Field label="Name" description="Used as the folder name">
          <Input value="" onChange={() => {}} />
        </Field>
      );

      const input = screen.getByLabelText('Name');
      expect(input).toBe(screen.getByRole('textbox'));

      const helper = screen.getByText('Used as the folder name');
      expect(input).toHaveAttribute('aria-describedby', helper.getAttribute('id'));
    });

    it('replaces the description with the error and announces it', () => {
      renderWithTheme(
        <Field label="Name" description="Used as the folder name" error="Name is required">
          <Input value="" onChange={() => {}} />
        </Field>
      );

      expect(screen.queryByText('Used as the folder name')).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Name is required');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('lets an explicit error prop on the input win over the Field', () => {
      renderWithTheme(
        <Field label="Name" error="Name is required">
          <Input value="" onChange={() => {}} error={false} />
        </Field>
      );

      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
    });

    it('renders no message when the error is not a string, but still marks the field invalid', () => {
      // Yup hands back an object for a nested schema.
      renderWithTheme(
        <Field label="Auto save" error={{ interval: 'must be a number' }}>
          <Input value="" onChange={() => {}} />
        </Field>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByText('must be a number')).not.toBeInTheDocument();
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });

    it('marks the control required without polluting the label name', () => {
      renderWithTheme(
        <Field label="Name" required>
          <Input value="" onChange={() => {}} />
        </Field>
      );

      const input = screen.getByLabelText('Name');
      expect(input).toBeRequired();
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('honours an explicit htmlFor over the generated id', () => {
      renderWithTheme(
        <Field label="Name" htmlFor="collection-name">
          <Input value="" onChange={() => {}} />
        </Field>
      );

      expect(screen.getByRole('textbox')).toHaveAttribute('id', 'collection-name');
    });
  });

  it('renders standalone, with no Field above it', () => {
    renderWithTheme(<Input variant="ghost" value="Content-Type" onChange={() => {}} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Content-Type');
    expect(input).toHaveAttribute('id');
  });
});

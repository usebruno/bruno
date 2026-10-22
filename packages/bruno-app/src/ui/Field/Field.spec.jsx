import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import Field from './index';
import Input from '../Input';

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
  font: { size: { xs: '0.6875rem', sm: '0.75rem', base: '0.8125rem' } }
};

const renderField = (props = {}) =>
  render(
    <ThemeProvider theme={theme}>
      <Field {...props}>
        <Input value="" onChange={() => {}} />
      </Field>
    </ThemeProvider>
  );

describe('Field', () => {
  it('labels the control and ties the helper text to it', () => {
    renderField({ label: 'Name', description: 'Shown in the sidebar' });

    const input = screen.getByLabelText('Name');
    const helper = screen.getByText('Shown in the sidebar');

    expect(input).toHaveAttribute('aria-describedby', helper.id);
    expect(helper).not.toHaveAttribute('role');
  });

  it('shows a string error instead of the description and announces it', () => {
    renderField({ label: 'Name', description: 'Shown in the sidebar', error: 'Name is required' });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Name is required');
    expect(screen.queryByText('Shown in the sidebar')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('marks the control invalid for a non-string error without announcing the description', () => {
    renderField({ label: 'Name', description: 'Shown in the sidebar', error: true });

    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Shown in the sidebar')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('marks the label and control as required', () => {
    renderField({ label: 'Name', required: true });

    expect(screen.getByText('Name')).toHaveClass('is-required');
    expect(screen.getByLabelText('Name')).toBeRequired();
  });

  it('uses the given htmlFor and sets data-testid only when passed', () => {
    const { container, unmount } = renderField({ label: 'Name', htmlFor: 'collection-name' });
    expect(screen.getByLabelText('Name')).toHaveAttribute('id', 'collection-name');
    expect(container.querySelector('[data-testid]')).toBeNull();
    unmount();

    renderField({ label: 'Name', ...{ 'data-testid': 'name-field' } });
    expect(screen.getByTestId('name-field')).toBeInTheDocument();
  });
});

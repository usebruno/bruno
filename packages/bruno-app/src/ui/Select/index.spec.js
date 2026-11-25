import '@testing-library/jest-dom';
import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import Dropdown from 'components/Dropdown';
import Select from './index';

jest.mock('components/Dropdown', () => jest.fn(() => null));

const renderSelect = (props = {}) =>
  render(
    <ThemeProvider theme={themes.light}>
      <Select data={['a', 'b']} value="a" onChange={jest.fn()} {...props} />
    </ThemeProvider>
  );

const lastDropdownProps = () => Dropdown.mock.calls[Dropdown.mock.calls.length - 1][0];

describe('Select popper options', () => {
  beforeEach(() => Dropdown.mockClear());

  it('registers only the sameWidth modifier without fitToSpace', () => {
    renderSelect();

    expect(lastDropdownProps().popperOptions.modifiers.map((modifier) => modifier.name)).toEqual(['sameWidth']);
  });

  it('adds the fit modifiers with fitToSpace', () => {
    renderSelect({ fitToSpace: true });

    expect(lastDropdownProps().popperOptions.modifiers.map((modifier) => modifier.name)).toEqual([
      'sameWidth',
      'fitToSpace',
      'flip'
    ]);
  });

  it('forwards appendTo to the dropdown', () => {
    const appendTo = jest.fn();
    renderSelect({ appendTo });

    expect(lastDropdownProps().appendTo).toBe(appendTo);
  });

  it('gives the listbox a test id built from the select test id', () => {
    renderSelect({ 'data-testid': 'branch-select' });
    const { getByRole } = render(lastDropdownProps().children);

    expect(getByRole('listbox')).toHaveAttribute('data-testid', 'branch-select-listbox');
  });

  it('leaves the listbox without a test id when the select has none', () => {
    renderSelect();
    const { getByRole } = render(lastDropdownProps().children);

    expect(getByRole('listbox')).not.toHaveAttribute('data-testid');
  });
});

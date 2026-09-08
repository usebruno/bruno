import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import IncludeExcludeTags from './index';

const renderWithTheme = (ui) => render(<ThemeProvider theme={themes.light}>{ui}</ThemeProvider>);

describe('IncludeExcludeTags', () => {
  it('renders labelled include and exclude tag inputs', () => {
    const { getByText, getByLabelText } = renderWithTheme(
      <IncludeExcludeTags tags={{ include: [], exclude: [] }} availableTags={['prod']} onChange={() => {}} />
    );
    expect(getByText('Include tags')).toBeInTheDocument();
    expect(getByText('Exclude tags')).toBeInTheDocument();
    expect(getByLabelText('Include tags')).toBeInTheDocument();
    expect(getByLabelText('Exclude tags')).toBeInTheDocument();
  });

  it('adds an existing collection tag to the include list', () => {
    const onChange = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <IncludeExcludeTags tags={{ include: [], exclude: [] }} availableTags={['prod', 'wip']} onChange={onChange} />
    );
    const input = getByLabelText('Include tags');
    fireEvent.change(input, { target: { value: 'prod' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(onChange).toHaveBeenCalledWith({ include: ['prod'], exclude: [] });
  });

  it('rejects a tag that does not exist in the collection', () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = renderWithTheme(
      <IncludeExcludeTags tags={{ include: [], exclude: [] }} availableTags={['prod']} onChange={onChange} />
    );
    const input = getByLabelText('Include tags');
    fireEvent.change(input, { target: { value: 'ghost' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(getByText('Tag does not exist')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('rejects a tag that is already in the other (exclude) list', () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = renderWithTheme(
      <IncludeExcludeTags tags={{ include: [], exclude: ['prod'] }} availableTags={['prod']} onChange={onChange} />
    );
    const input = getByLabelText('Include tags');
    fireEvent.change(input, { target: { value: 'prod' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(getByText('Tag is already in the exclude list')).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a tag from the include list', () => {
    const onChange = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <IncludeExcludeTags tags={{ include: ['prod'], exclude: [] }} availableTags={['prod']} onChange={onChange} />
    );
    fireEvent.click(getByLabelText('Remove prod'));

    expect(onChange).toHaveBeenCalledWith({ include: [], exclude: [] });
  });
});

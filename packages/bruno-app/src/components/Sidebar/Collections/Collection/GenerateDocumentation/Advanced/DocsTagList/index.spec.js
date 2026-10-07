import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import DocsTagList from './index';

const renderWithTheme = (ui) => render(<ThemeProvider theme={themes.light}>{ui}</ThemeProvider>);

describe('DocsTagList', () => {
  it('adds a tag on Enter and stops it from bubbling to a parent that submits on Enter', () => {
    const onParentKeyDown = jest.fn();
    const handleAddTag = jest.fn();
    const { getByTestId } = renderWithTheme(
      <div onKeyDown={onParentKeyDown}>
        <DocsTagList tags={[]} tagsHintList={['smoke']} handleAddTag={handleAddTag} handleRemoveTag={() => {}} />
      </div>
    );
    const input = getByTestId('docs-tag-input');
    fireEvent.change(input, { target: { value: 'smoke' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(handleAddTag).toHaveBeenCalledWith('smoke');
    expect(onParentKeyDown).not.toHaveBeenCalled();
  });

  it('lets other keys bubble to the parent', () => {
    const onParentKeyDown = jest.fn();
    const { getByTestId } = renderWithTheme(
      <div onKeyDown={onParentKeyDown}>
        <DocsTagList tags={[]} tagsHintList={[]} handleAddTag={() => {}} handleRemoveTag={() => {}} />
      </div>
    );
    fireEvent.keyDown(getByTestId('docs-tag-input'), { key: 'a', code: 'KeyA' });

    expect(onParentKeyDown).toHaveBeenCalledTimes(1);
  });

  it('renders each tag as a chip and removes it on click', () => {
    const handleRemoveTag = jest.fn();
    const { getByLabelText, getByText } = renderWithTheme(
      <DocsTagList tags={['prod']} tagsHintList={[]} handleAddTag={() => {}} handleRemoveTag={handleRemoveTag} />
    );
    expect(getByText('prod')).toBeInTheDocument();
    fireEvent.click(getByLabelText('Remove prod'));

    expect(handleRemoveTag).toHaveBeenCalledWith('prod');
  });

  it('exposes combobox and listbox semantics for assistive tech', () => {
    const { getByTestId, getByRole, getAllByRole, queryByRole } = renderWithTheme(
      <DocsTagList
        tags={[]}
        tagsHintList={['smoke', 'regression']}
        handleAddTag={() => {}}
        handleRemoveTag={() => {}}
        ariaLabel="Include tags"
      />
    );
    const input = getByTestId('docs-tag-input');
    expect(input).toHaveAttribute('role', 'combobox');
    expect(input).toHaveAttribute('aria-label', 'Include tags');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.focus(input);
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(getByRole('listbox')).toBeInTheDocument();
    expect(getAllByRole('option')).toHaveLength(2);
  });

  it('lets Escape bubble to the parent when no suggestion menu is open', () => {
    const onParentKeyDown = jest.fn();
    const { getByTestId } = renderWithTheme(
      <div onKeyDown={onParentKeyDown}>
        <DocsTagList tags={[]} tagsHintList={[]} handleAddTag={() => {}} handleRemoveTag={() => {}} />
      </div>
    );
    const input = getByTestId('docs-tag-input');
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(onParentKeyDown).toHaveBeenCalledTimes(1);
  });
});

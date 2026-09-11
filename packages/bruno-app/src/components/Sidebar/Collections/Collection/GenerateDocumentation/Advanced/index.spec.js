import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent, within } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import Advanced from './index';

const defaultProps = {
  filterByTags: false,
  onFilterModeChange: jest.fn(),
  tags: { include: [], exclude: [] },
  availableTags: ['prod', 'wip'],
  onTagsChange: jest.fn(),
  includeGitLink: true,
  onGitLinkToggle: jest.fn(),
  hasGitUrl: true
};

const renderAdvanced = (props = {}) => {
  const utils = render(
    <ThemeProvider theme={themes.light}>
      <Advanced {...defaultProps} {...props} />
    </ThemeProvider>
  );

  const rerenderWith = (nextProps) =>
    utils.rerender(
      <ThemeProvider theme={themes.light}>
        <Advanced {...defaultProps} {...props} {...nextProps} />
      </ThemeProvider>
    );

  return { ...utils, rerenderWith };
};

const expand = (getByTestId) => fireEvent.click(getByTestId('docs-advanced-toggle'));

describe('Advanced (Generate Documentation)', () => {
  it('offers a choice between all requests and filtering by tags, with all requests picked to begin with', () => {
    const { getByRole, getByTestId } = renderAdvanced();
    expand(getByTestId);

    const choices = within(getByRole('radiogroup', { name: 'Requests to include' }));
    expect(choices.getByRole('radio', { name: 'All requests' })).toBeChecked();
    expect(choices.getByRole('radio', { name: 'Filter by Tags' })).not.toBeChecked();
  });

  it('shows filtering by tags as the current choice when the user is already filtering', () => {
    const { getByRole, getByTestId } = renderAdvanced({ filterByTags: true });
    expand(getByTestId);

    expect(getByRole('radio', { name: 'Filter by Tags' })).toBeChecked();
    expect(getByRole('radio', { name: 'All requests' })).not.toBeChecked();
  });

  it('starts filtering by tags when the user picks that choice', () => {
    const onFilterModeChange = jest.fn();
    const { getByTestId } = renderAdvanced({ onFilterModeChange });
    expand(getByTestId);

    fireEvent.click(getByTestId('docs-requests-filter'));
    expect(onFilterModeChange).toHaveBeenCalledWith(true);
  });

  it('goes back to including every request when the user picks all requests', () => {
    const onFilterModeChange = jest.fn();
    const { getByTestId } = renderAdvanced({ filterByTags: true, onFilterModeChange });
    expand(getByTestId);

    fireEvent.click(getByTestId('docs-requests-all'));
    expect(onFilterModeChange).toHaveBeenCalledWith(false);
  });

  it('asks for tags to include and exclude only while the user is filtering by tags', () => {
    const { queryByLabelText, rerenderWith } = renderAdvanced({ filterByTags: false });
    expect(queryByLabelText('Include tags')).not.toBeInTheDocument();
    expect(queryByLabelText('Exclude tags')).not.toBeInTheDocument();

    rerenderWith({ filterByTags: true });

    expect(queryByLabelText('Include tags')).toBeInTheDocument();
    expect(queryByLabelText('Exclude tags')).toBeInTheDocument();
  });

  it('explains what a tag is in a hint next to the filter choice', () => {
    const { getByTestId } = renderAdvanced();
    expand(getByTestId);

    const hint = getByTestId('docs-requests-filter').closest('label').querySelector('.seg-hint');
    expect(hint).toBeInTheDocument();
    expect(hint.getAttribute('data-tooltip-content')).toContain('Tags are labels');
  });

  it('reports the change when the git repo link switch is flipped', () => {
    const onGitLinkToggle = jest.fn();
    const { getByTestId } = renderAdvanced({ onGitLinkToggle });
    expand(getByTestId);

    fireEvent.click(getByTestId('docs-git-link-toggle').querySelector('input[type="checkbox"]'));
    expect(onGitLinkToggle).toHaveBeenCalled();
  });

  it('offers the git repo link setting only when the collection has a git url', () => {
    const { getByTestId, queryByTestId, rerenderWith } = renderAdvanced({ hasGitUrl: false });
    expand(getByTestId);
    expect(queryByTestId('docs-git-link')).not.toBeInTheDocument();

    rerenderWith({ hasGitUrl: true });

    expect(queryByTestId('docs-git-link')).toBeInTheDocument();
  });

  it('keeps the advanced options away from screen readers and the tab order until the section is opened', () => {
    const { getByTestId, container } = renderAdvanced();
    const collapse = container.querySelector('.advanced-collapse');

    expect(collapse).toHaveAttribute('aria-hidden', 'true');
    expect(collapse).toHaveAttribute('inert');

    expand(getByTestId);

    expect(collapse).toHaveAttribute('aria-hidden', 'false');
    expect(collapse).not.toHaveAttribute('inert');
  });
});

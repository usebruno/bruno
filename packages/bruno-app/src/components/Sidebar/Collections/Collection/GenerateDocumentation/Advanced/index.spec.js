import '@testing-library/jest-dom';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
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
  onGitLinkToggle: jest.fn()
};

const renderAdvanced = (props = {}) =>
  render(
    <ThemeProvider theme={themes.light}>
      <Advanced {...defaultProps} {...props} />
    </ThemeProvider>
  );

const expand = (getByTestId) => fireEvent.click(getByTestId('docs-advanced-toggle'));

describe('Advanced (Generate Documentation)', () => {
  it('exposes the requests selector as a labelled group of pressable options', () => {
    const { getByRole, getByTestId } = renderAdvanced();
    expand(getByTestId);

    expect(getByRole('group', { name: 'Requests to include' })).toBeInTheDocument();
    expect(getByTestId('docs-requests-all')).toHaveAttribute('aria-pressed', 'true');
    expect(getByTestId('docs-requests-filter')).toHaveAttribute('aria-pressed', 'false');
  });

  it('switches the mode when "Filter by Tags" is pressed', () => {
    const onFilterModeChange = jest.fn();
    const { getByTestId } = renderAdvanced({ onFilterModeChange });
    expand(getByTestId);

    fireEvent.click(getByTestId('docs-requests-filter'));
    expect(onFilterModeChange).toHaveBeenCalledWith(true);
  });

  it('reflects the active mode via aria-pressed', () => {
    const { getByTestId } = renderAdvanced({ filterByTags: true });
    expect(getByTestId('docs-requests-all')).toHaveAttribute('aria-pressed', 'false');
    expect(getByTestId('docs-requests-filter')).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows the include/exclude tag inputs only when filtering by tags', () => {
    const { queryByLabelText, rerender } = renderAdvanced({ filterByTags: false });
    expect(queryByLabelText('Include tags')).not.toBeInTheDocument();

    rerender(
      <ThemeProvider theme={themes.light}>
        <Advanced {...defaultProps} filterByTags={true} />
      </ThemeProvider>
    );
    expect(queryByLabelText('Include tags')).toBeInTheDocument();
  });

  it('shows the tags help hint inside the Filter by Tags segment', () => {
    const { getByTestId } = renderAdvanced();
    expand(getByTestId);

    const hint = getByTestId('docs-requests-filter').querySelector('.seg-hint');
    expect(hint).toBeInTheDocument();
    expect(hint.getAttribute('data-tooltip-content')).toContain('Tags are labels');
  });

  it('toggles the git repo link when the switch is clicked', () => {
    const onGitLinkToggle = jest.fn();
    const { getByText, getByRole, getByTestId } = renderAdvanced({ onGitLinkToggle });
    expand(getByTestId);

    expect(getByText('Include git repo URL')).toBeInTheDocument();
    fireEvent.click(getByRole('checkbox'));
    expect(onGitLinkToggle).toHaveBeenCalled();
  });

  it('keeps the collapsible body out of the a11y tree and tab order until expanded', () => {
    const { getByTestId, container } = renderAdvanced();
    const collapse = container.querySelector('.advanced-collapse');

    expect(collapse).toHaveAttribute('aria-hidden', 'true');
    expect(collapse).toHaveAttribute('inert');

    expand(getByTestId);

    expect(collapse).toHaveAttribute('aria-hidden', 'false');
    expect(collapse).not.toHaveAttribute('inert');
  });
});

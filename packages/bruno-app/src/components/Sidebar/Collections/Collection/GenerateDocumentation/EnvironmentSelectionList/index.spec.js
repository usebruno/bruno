import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EnvironmentSelectionList from './index';

const ENVIRONMENTS = [
  { uid: 'env-1', name: 'Production' },
  { uid: 'env-2', name: 'Development' },
  { uid: 'env-3', name: 'Staging' }
];

describe('EnvironmentSelectionList', () => {
  it('renders a zero count and an empty, non-indeterminate "Select All" when nothing is selected', () => {
    render(<EnvironmentSelectionList environments={ENVIRONMENTS} selectedUids={[]} />);

    // The modal opens with no environments selected (safe-by-default, opt-in inclusion).
    expect(screen.getByTestId('env-selected-count')).toHaveTextContent('(0/3 selected)');

    const selectAll = screen.getByTestId('env-select-all');
    expect(selectAll).not.toBeChecked();
    expect(selectAll.indeterminate).toBe(false);
  });

  it('checks "Select All" and shows a full count when every environment is selected', () => {
    render(
      <EnvironmentSelectionList environments={ENVIRONMENTS} selectedUids={ENVIRONMENTS.map((env) => env.uid)} />
    );

    expect(screen.getByTestId('env-selected-count')).toHaveTextContent('(3/3 selected)');

    const selectAll = screen.getByTestId('env-select-all');
    expect(selectAll).toBeChecked();
    expect(selectAll.indeterminate).toBe(false);
  });

  it('shows a partial count and an indeterminate "Select All" when some are selected', () => {
    render(<EnvironmentSelectionList environments={ENVIRONMENTS} selectedUids={['env-2']} />);

    expect(screen.getByTestId('env-selected-count')).toHaveTextContent('(1/3 selected)');
    expect(screen.getByTestId('env-select-all').indeterminate).toBe(true);
  });

  it('requests selecting all when "Select All" is clicked from the empty default', () => {
    const onToggleAll = jest.fn();
    render(<EnvironmentSelectionList environments={ENVIRONMENTS} selectedUids={[]} onToggleAll={onToggleAll} />);

    fireEvent.click(screen.getByTestId('env-select-all'));
    expect(onToggleAll).toHaveBeenCalledWith(true);
  });

  it('requests deselecting all when "Select All" is clicked while fully selected', () => {
    const onToggleAll = jest.fn();
    render(
      <EnvironmentSelectionList
        environments={ENVIRONMENTS}
        selectedUids={ENVIRONMENTS.map((env) => env.uid)}
        onToggleAll={onToggleAll}
      />
    );

    fireEvent.click(screen.getByTestId('env-select-all'));
    expect(onToggleAll).toHaveBeenCalledWith(false);
  });

  it('renders nothing when the collection has no environments', () => {
    const { container } = render(<EnvironmentSelectionList environments={[]} selectedUids={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

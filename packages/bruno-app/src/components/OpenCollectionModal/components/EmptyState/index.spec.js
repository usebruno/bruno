import React from 'react';
import { render, screen } from '@testing-library/react';
import { IconClock } from '@tabler/icons';
import { ThemeProvider } from 'providers/Theme';
import EmptyState from './index';

const renderEmptyState = (before = null) =>
  render(
    <ThemeProvider>
      {before}
      <EmptyState
        icon={IconClock}
        title="Nothing here yet"
        actions={(
          <>
            <button type="button">First action</button>
            <button type="button">Second action</button>
          </>
        )}
        foot="Look somewhere else."
        data-testid="empty"
      >
        Things you add show up here.
      </EmptyState>
    </ThemeProvider>
  );

describe('EmptyState', () => {
  it('shows the title, text, actions and foot', () => {
    renderEmptyState();

    const emptyState = screen.getByTestId('empty');
    expect(screen.getByRole('heading', { name: 'Nothing here yet' })).toBeInTheDocument();
    expect(emptyState).toHaveTextContent('Things you add show up here.');
    expect(screen.getByRole('button', { name: 'Second action' })).toBeInTheDocument();
    expect(emptyState).toHaveTextContent('Look somewhere else.');
  });

  it('puts focus on its first action when nothing else has it', () => {
    renderEmptyState();

    expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus();
  });

  it('leaves focus on another control', () => {
    renderEmptyState(<input aria-label="Elsewhere" autoFocus />);

    expect(screen.getByRole('textbox', { name: 'Elsewhere' })).toHaveFocus();
  });
});

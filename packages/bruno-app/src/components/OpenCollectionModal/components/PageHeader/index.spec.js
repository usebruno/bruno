import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import PageHeader from './index';

const renderHeader = (props = {}) => {
  const onClose = jest.fn();
  const { container } = render(
    <ThemeProvider>
      <PageHeader title="Locations" onClose={onClose} {...props} />
    </ThemeProvider>
  );
  return { container, onClose };
};

describe('PageHeader', () => {
  it('shows the title with its description', () => {
    renderHeader({ title: 'Recents', description: 'Collections you opened recently, including ones you closed' });

    expect(screen.getByTestId('open-collection-page-title')).toHaveTextContent('Recents');
    expect(screen.getByText('Collections you opened recently, including ones you closed')).toBeInTheDocument();
  });

  it('shows an element as the description', () => {
    renderHeader({ description: <button type="button">Manage</button> });

    expect(screen.getByRole('button', { name: 'Manage' })).toBeInTheDocument();
  });

  it('leaves the description out when the page has none', () => {
    const { container } = renderHeader();

    expect(container.querySelector('.page-header-description')).toBeNull();
  });

  it('offers Back with focus on it when the page can go back', () => {
    const onBack = jest.fn();
    renderHeader({ onBack });
    const back = screen.getByRole('button', { name: 'Back' });

    expect(back).toHaveFocus();
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('has no Back button when the page cannot go back', () => {
    renderHeader();

    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
  });

  it('closes from the Close button', () => {
    const { onClose } = renderHeader();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

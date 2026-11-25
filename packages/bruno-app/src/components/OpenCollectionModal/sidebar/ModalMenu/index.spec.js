import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import openCollectionModalReducer from 'providers/ReduxStore/slices/open-collection-modal';
import { OPEN_COLLECTION_PAGES } from '../pages';
import ModalMenu from './index';

const renderMenu = (activePageId = 'choose-folder') => {
  const store = configureStore({
    reducer: { openCollectionModal: openCollectionModalReducer },
    preloadedState: {
      openCollectionModal: { ...openCollectionModalReducer(undefined, { type: 'init' }), isOpen: true, page: activePageId }
    }
  });
  render(
    <Provider store={store}>
      <ThemeProvider>
        <ModalMenu titleId="menu-title" activePageId={activePageId} />
      </ThemeProvider>
    </Provider>
  );
  return store;
};

const menuItems = () => within(screen.getByTestId('open-collection-menu')).getAllByRole('button');

describe('ModalMenu', () => {
  it('lists every page in registry order', () => {
    renderMenu();

    expect(menuItems().map((item) => item.textContent)).toEqual(OPEN_COLLECTION_PAGES.map((page) => page.label));
  });

  it('lists the source pages under Sources', () => {
    renderMenu();

    const sources = screen.getByRole('group', { name: 'Sources' });
    const sourceLabels = OPEN_COLLECTION_PAGES.filter((page) => page.group === 'sources').map((page) => page.label);
    expect(sourceLabels).toEqual(expect.arrayContaining(['My computer', 'Registry', 'API Catalog']));
    expect(within(sources).getAllByRole('button').map((item) => item.textContent)).toEqual(sourceLabels);
  });

  it('marks only the active page', () => {
    renderMenu('recents');

    const current = menuItems().filter((item) => item.getAttribute('aria-current') === 'page');
    expect(current).toEqual([screen.getByTestId('open-collection-menu-item-recents')]);
  });

  it('switches the page when an item is clicked', () => {
    const store = renderMenu();

    fireEvent.click(screen.getByTestId('open-collection-menu-item-my-computer'));

    expect(store.getState().openCollectionModal.page).toBe('my-computer');
  });

  it('moves focus with the arrow keys and wraps at both ends', () => {
    renderMenu();
    const items = menuItems();
    items[0].focus();

    fireEvent.keyDown(items[0], { key: 'ArrowDown' });
    expect(items[1]).toHaveFocus();

    fireEvent.keyDown(items[1], { key: 'ArrowUp' });
    fireEvent.keyDown(items[0], { key: 'ArrowUp' });
    expect(items[items.length - 1]).toHaveFocus();

    fireEvent.keyDown(items[items.length - 1], { key: 'ArrowDown' });
    expect(items[0]).toHaveFocus();
  });
});

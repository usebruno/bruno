import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { VirtuosoMockContext } from 'react-virtuoso';
import { ThemeProvider } from 'providers/Theme';
import CollectionList from './index';

const collections = [
  { path: '/Users/me/work/payments', name: 'payments', meta: 'Opened 5m ago' },
  { path: '/Users/me/work/billing', name: 'Billing', meta: 'Closed 1h ago' },
  { path: '/Users/me/shop/orders-api', name: 'Orders', meta: 'Closed yesterday' },
  { path: '/Users/me/work/accounts', name: 'Accounts', meta: 'Opened 3d ago' }
];

const renderList = (props = {}) => {
  const handlers = { onChooseFolder: jest.fn(), onOpen: jest.fn(), onSwitch: jest.fn(), onCancel: jest.fn() };
  const list = (listProps) => (
    <ThemeProvider>
      <VirtuosoMockContext.Provider value={{ viewportHeight: 1000, itemHeight: 49 }}>
        <CollectionList
          collections={collections}
          openPathKeys={new Set()}
          getMeta={(collection) => collection.meta}
          noMatchText="Only collections you have opened before are listed."
          testIdPrefix="list"
          {...handlers}
          {...listProps}
        />
      </VirtuosoMockContext.Provider>
    </ThemeProvider>
  );
  const { rerender } = render(list(props));
  return { ...handlers, rerender: (nextProps) => rerender(list({ ...props, ...nextProps })) };
};

const rows = () => screen.queryAllByTestId('list-row');
const rowNames = () => rows().map((row) => within(row).getByTestId('list-row-name').textContent);
const rowFor = (name) => rows().find((row) => within(row).getByTestId('list-row-name').textContent === name);
const searchBox = () => screen.getByTestId('list-search');
const search = (text) => fireEvent.change(searchBox(), { target: { value: text } });
const openSelectedButton = () => screen.queryByTestId('list-open-selected');

describe('CollectionList', () => {
  it('shows each collection with the folder it sits in and its meta', () => {
    renderList();

    const payments = rowFor('payments');
    expect(within(payments).getByTestId('list-row-path')).toHaveTextContent('~/work');
    expect(within(payments).getByTestId('list-row-path')).toHaveAttribute('title', '/Users/me/work/payments');
    expect(within(payments).getByTestId('list-row-meta')).toHaveTextContent('Opened 5m ago');
    expect(within(rowFor('Orders')).getByTestId('list-row-path')).toHaveTextContent('~/shop/orders-api');
  });

  it('keeps the given order and moves the collections already open to the end', () => {
    renderList({ openPathKeys: new Set(['/Users/me/work/payments']) });

    expect(rowNames()).toEqual(['Billing', 'Orders', 'Accounts', 'payments']);
  });

  it('greys out a collection that is already open and never ticks it', () => {
    renderList({ openPathKeys: new Set(['/Users/me/work/billing']) });
    const billing = rowFor('Billing');

    expect(billing).toHaveClass('is-open');
    expect(within(billing).queryByLabelText('Select Billing')).not.toBeInTheDocument();
    expect(within(billing).queryByTestId('list-row-open')).not.toBeInTheDocument();

    fireEvent.click(billing);
    fireEvent.keyDown(billing, { key: ' ' });

    expect(openSelectedButton()).not.toBeInTheDocument();
  });

  it('switches to a collection that is already open from its Switch button or with Enter', () => {
    const { onOpen, onSwitch } = renderList({ openPathKeys: new Set(['/Users/me/work/billing']) });

    fireEvent.click(within(rowFor('Billing')).getByRole('button', { name: 'Switch to Billing' }));
    fireEvent.keyDown(rowFor('Billing'), { key: 'Enter' });

    expect(onSwitch).toHaveBeenCalledTimes(2);
    expect(onSwitch).toHaveBeenCalledWith('/Users/me/work/billing');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('ticks rows with a click or Space and shows the footer only while something is ticked', () => {
    const { onOpen, onCancel } = renderList();
    expect(openSelectedButton()).not.toBeInTheDocument();

    fireEvent.click(rowFor('Orders'));
    expect(within(rowFor('Orders')).getByLabelText('Select Orders')).toBeChecked();
    expect(openSelectedButton()).toHaveTextContent('Open 1 collection');

    fireEvent.keyDown(rowFor('payments'), { key: ' ' });
    expect(openSelectedButton()).toHaveTextContent('Open 2 collections');
    expect(rowFor('Billing')).toHaveClass('is-selecting');

    fireEvent.click(openSelectedButton());
    expect(onOpen).toHaveBeenCalledWith(['/Users/me/work/payments', '/Users/me/shop/orders-api']);

    fireEvent.click(screen.getByTestId('list-cancel'));
    expect(onCancel).toHaveBeenCalled();

    fireEvent.click(rowFor('Orders'));
    fireEvent.click(rowFor('payments'));
    expect(openSelectedButton()).not.toBeInTheDocument();
    expect(rowFor('Billing')).not.toHaveClass('is-selecting');
  });

  it('opens one collection from its Open button or with Enter, without ticking it', () => {
    const { onOpen } = renderList();

    fireEvent.click(within(rowFor('Billing')).getByRole('button', { name: 'Open Billing' }));
    expect(onOpen).toHaveBeenCalledWith(['/Users/me/work/billing']);

    fireEvent.keyDown(rowFor('Accounts'), { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledWith(['/Users/me/work/accounts']);

    expect(openSelectedButton()).not.toBeInTheDocument();
  });

  it('does nothing on a double click', () => {
    const { onOpen } = renderList();

    fireEvent.doubleClick(rowFor('Billing'));

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('ticks every row between the last ticked one and a shift-clicked one', () => {
    renderList();

    fireEvent.click(rowFor('payments'));
    fireEvent.click(rowFor('Orders'), { shiftKey: true });

    expect(openSelectedButton()).toHaveTextContent('Open 3 collections');
    expect(within(rowFor('Billing')).getByLabelText('Select Billing')).toBeChecked();
    expect(within(rowFor('Accounts')).getByLabelText('Select Accounts')).not.toBeChecked();
  });

  it('ticks a range with Shift and Space too, among the rows the search shows', () => {
    renderList();
    search('work');

    fireEvent.keyDown(rowFor('Accounts'), { key: ' ' });
    fireEvent.keyDown(rowFor('payments'), { key: ' ', shiftKey: true });

    expect(rowNames()).toEqual(['payments', 'Billing', 'Accounts']);
    expect(openSelectedButton()).toHaveTextContent('Open 3 collections');
  });

  it('moves focus between rows with the arrow keys and stops at both ends', () => {
    renderList();
    rowFor('payments').focus();

    fireEvent.keyDown(rowFor('payments'), { key: 'ArrowDown' });
    expect(rowFor('Billing')).toHaveFocus();

    fireEvent.keyDown(rowFor('Billing'), { key: 'ArrowUp' });
    fireEvent.keyDown(rowFor('payments'), { key: 'ArrowUp' });
    expect(rowFor('payments')).toHaveFocus();

    rowFor('Accounts').focus();
    fireEvent.keyDown(rowFor('Accounts'), { key: 'ArrowDown' });
    expect(rowFor('Accounts')).toHaveFocus();
  });

  it('makes each row a tab stop and leaves the checkbox and the list box out of the tab order', () => {
    renderList();

    expect(rowFor('Billing')).toHaveAttribute('tabindex', '0');
    expect(within(rowFor('Billing')).getByLabelText('Select Billing')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('list-list').querySelectorAll('[tabindex="0"]')).toHaveLength(rows().length);
  });

  it('finds collections by name, by path and by the path shown with ~, in the same order', () => {
    renderList();

    search('  BILL ');
    expect(rowNames()).toEqual(['Billing']);

    search('/users/me/shop');
    expect(rowNames()).toEqual(['Orders']);

    search('~/work/');
    expect(rowNames()).toEqual(['payments', 'Billing', 'Accounts']);
  });

  it('keeps rows ticked while the search hides them and opens them with the rest', () => {
    const { onOpen } = renderList();
    fireEvent.click(rowFor('Accounts'));

    search('bill');
    fireEvent.click(rowFor('Billing'));

    expect(openSelectedButton()).toHaveTextContent('Open 2 collections');
    fireEvent.click(openSelectedButton());
    expect(onOpen).toHaveBeenCalledWith(['/Users/me/work/billing', '/Users/me/work/accounts']);

    fireEvent.click(screen.getByTestId('list-search-clear'));
    expect(searchBox()).toHaveFocus();
    expect(within(rowFor('Accounts')).getByLabelText('Select Accounts')).toBeChecked();
  });

  it('says when nothing matches and offers to choose a folder', () => {
    const { onChooseFolder } = renderList();

    search('  zzz ');

    const noMatch = screen.getByTestId('list-no-match');
    expect(noMatch).toHaveTextContent('No collection matches “zzz”');
    expect(noMatch).toHaveTextContent('Only collections you have opened before are listed.');
    fireEvent.click(within(noMatch).getByRole('button', { name: 'Choose folder…' }));
    expect(onChooseFolder).toHaveBeenCalled();
  });

  it('offers to choose a folder next to the search box', () => {
    const { onChooseFolder } = renderList();
    const chooseFolder = screen.getByTestId('list-choose-folder');

    expect(chooseFolder).toHaveTextContent('Choose folder…');
    expect(chooseFolder).toHaveAttribute('title', 'Choose a collection folder to open it in place');
    expect(searchBox()).toHaveAttribute('placeholder', 'Search collections');
    expect(searchBox()).toHaveAccessibleName('Search collections');

    fireEvent.click(chooseFolder);
    expect(onChooseFolder).toHaveBeenCalled();
  });

  it('puts focus in the search box when it appears', () => {
    renderList();

    expect(searchBox()).toHaveFocus();
  });

  it('moves focus to the search box when the focused row goes away', async () => {
    const { rerender } = renderList();
    rowFor('Billing').focus();

    rerender({ collections: collections.filter((collection) => collection.name !== 'Billing') });
    await act(async () => {});

    expect(searchBox()).toHaveFocus();
  });

  it('moves focus to the search box when the ticked rows go away while the footer has it', async () => {
    const { rerender } = renderList();
    fireEvent.click(rowFor('Billing'));
    openSelectedButton().focus();

    rerender({ collections: collections.filter((collection) => collection.name !== 'Billing') });
    await act(async () => {});

    expect(openSelectedButton()).not.toBeInTheDocument();
    expect(searchBox()).toHaveFocus();
  });

  it('leaves the divider off only the last row', () => {
    renderList();
    const itemFor = (name) => rowFor(name).closest('.collection-list-item');

    expect(itemFor('Accounts')).toHaveClass('is-last');
    expect(itemFor('Orders')).not.toHaveClass('is-last');
  });
});

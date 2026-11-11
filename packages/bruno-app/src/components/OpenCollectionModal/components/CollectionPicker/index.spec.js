import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { VirtuosoMockContext } from 'react-virtuoso';
import { ThemeProvider } from 'providers/Theme';
import CollectionPicker from './index';

const collections = [
  { path: '/Users/me/work/payments', name: 'Payments' },
  { path: '/Users/me/work/billing', name: 'Billing' },
  { path: '/Users/me/work/shop/orders', name: 'Orders' },
  { path: '/Users/me/work/accounts', name: 'Accounts' }
];

const renderPicker = (props = {}) => {
  const handlers = { onOpen: jest.fn(), onCancel: jest.fn(), onChooseOtherFolders: jest.fn() };
  render(
    <ThemeProvider>
      <VirtuosoMockContext.Provider value={{ viewportHeight: 1000, itemHeight: 58 }}>
        <CollectionPicker
          collections={collections}
          folders={['/Users/me/work']}
          initialSelection={[]}
          openPathKeys={new Set()}
          testIdPrefix="picker"
          {...handlers}
          {...props}
        />
      </VirtuosoMockContext.Provider>
    </ThemeProvider>
  );
  return handlers;
};

const rows = () => screen.queryAllByTestId('picker-row');
const rowNames = () => rows().map((row) => row.querySelector('.collection-row-name').textContent);
const rowFor = (name) => rows().find((row) => row.querySelector('.collection-row-name').textContent === name);
const openButton = () => screen.getByTestId('picker-open-selected');
const footerStart = () => document.querySelector('.collection-picker-footer-start');
const search = (text) => fireEvent.change(screen.getByTestId('picker-search'), { target: { value: text } });

describe('CollectionPicker', () => {
  beforeAll(() => {
    window.ipcRenderer = { send: jest.fn() };
    Element.prototype.checkVisibility = () => true;
  });

  afterAll(() => {
    delete window.ipcRenderer;
    delete Element.prototype.checkVisibility;
  });

  it('says how many collections were found in the picked folder', () => {
    renderPicker();

    expect(document.querySelector('.collection-picker-summary strong')).toHaveTextContent('4 collections in ~/work');
  });

  it('counts the picked folders when there are several', () => {
    renderPicker({ folders: ['/Users/me/work', '/Users/me/shop'] });

    expect(document.querySelector('.collection-picker-summary strong')).toHaveTextContent('4 collections in 2 folders');
  });

  it('lists the collections in the order found, with the ones already open last', () => {
    renderPicker({ openPathKeys: new Set(['/Users/me/work/payments']) });

    expect(rowNames()).toEqual(['Billing', 'Orders', 'Accounts', 'Payments']);
  });

  it('shows each collection’s path and where it sits in the picked folder', () => {
    renderPicker({ collections: [...collections, { path: '/Users/me/api', name: 'API' }] });

    const orders = rowFor('Orders');
    expect(orders.querySelector('.collection-row-path')).toHaveTextContent('~/work/shop/orders');
    expect(orders.querySelector('.collection-row-path')).toHaveAttribute('title', '/Users/me/work/shop/orders');
    expect(orders.querySelector('.collection-row-meta')).toHaveTextContent('shop/orders');
    expect(orders.querySelector('.collection-row-meta')).toHaveAttribute('title', 'shop/orders');
    expect(rowFor('API').querySelector('.collection-row-meta')).toHaveTextContent('api');
  });

  it('marks a collection that is already open and leaves it out of the selection', () => {
    renderPicker({ openPathKeys: new Set(['/Users/me/work/billing']) });
    const billing = rowFor('Billing');

    expect(billing).toHaveClass('is-open');
    expect(billing.querySelector('.collection-row-meta')).toHaveTextContent('Already open');
    expect(within(billing).getByLabelText('Select Billing')).toBeDisabled();
    expect(within(billing).queryByTestId('picker-row-open')).not.toBeInTheDocument();

    fireEvent.click(billing);
    expect(within(billing).getByLabelText('Select Billing')).not.toBeChecked();
    expect(openButton()).toBeDisabled();
  });

  it('selects a row when it is clicked and offers to clear the selection', () => {
    const { onOpen } = renderPicker();
    expect(footerStart()).toHaveTextContent('Choose other folders…');
    expect(openButton()).toHaveTextContent('Open');
    expect(openButton()).toBeDisabled();

    fireEvent.click(rowFor('Payments'));
    fireEvent.click(within(rowFor('Orders')).getByLabelText('Select Orders'));

    expect(footerStart()).toHaveTextContent('2 selected');
    expect(openButton()).toHaveTextContent('Open 2 collections');
    fireEvent.click(openButton());
    expect(onOpen).toHaveBeenCalledWith(['/Users/me/work/payments', '/Users/me/work/shop/orders']);

    fireEvent.click(screen.getByTestId('picker-clear-selection'));
    expect(footerStart()).toHaveTextContent('Choose other folders…');
    expect(openButton()).toBeDisabled();
  });

  it('starts with the initial selection', () => {
    renderPicker({ initialSelection: ['/Users/me/work/billing'] });

    expect(openButton()).toHaveTextContent('Open 1 collection');
  });

  it('shows an already open collection as picked without counting it', () => {
    renderPicker({ initialSelection: ['/Users/me/work/billing'], openPathKeys: new Set(['/Users/me/work/billing']) });

    expect(within(rowFor('Billing')).getByLabelText('Select Billing')).toBeChecked();
    expect(openButton()).toBeDisabled();
    expect(footerStart()).toHaveTextContent('Choose other folders…');
  });

  it('leaves the list box out of the tab order', () => {
    renderPicker();

    expect(screen.getByTestId('picker-list').querySelector('[tabindex="0"]')).toBeNull();
  });

  it('selects every shown collection, then clears them', () => {
    renderPicker({ openPathKeys: new Set(['/Users/me/work/billing']) });
    const selectAll = screen.getByTestId('picker-select-all');
    expect(selectAll).toHaveTextContent('Select all');

    fireEvent.click(selectAll);
    expect(openButton()).toHaveTextContent('Open 3 collections');
    expect(selectAll).toHaveTextContent('Clear selection');

    fireEvent.click(selectAll);
    expect(openButton()).toBeDisabled();
  });

  it('clears only the shown collections and keeps the selections the search hides', () => {
    renderPicker({
      collections: [...collections, { path: '/Users/me/work/pay-ins', name: 'Pay ins' }],
      initialSelection: ['/Users/me/work/accounts']
    });
    search('pay');
    const selectAll = screen.getByTestId('picker-select-all');

    fireEvent.click(selectAll);
    expect(openButton()).toHaveTextContent('Open 3 collections');

    fireEvent.click(selectAll);
    expect(openButton()).toHaveTextContent('Open 1 collection');
  });

  it('offers Select all only when two or more collections can be picked', () => {
    renderPicker({ openPathKeys: new Set(['/Users/me/work/billing', '/Users/me/work/shop/orders', '/Users/me/work/accounts']) });

    expect(screen.queryByTestId('picker-select-all')).not.toBeInTheDocument();
  });

  it('searches names and paths, and keeps counting selected collections the search hides', () => {
    renderPicker({ initialSelection: ['/Users/me/work/accounts'] });

    search('shop/');
    expect(rowNames()).toEqual(['Orders']);

    search('~/work/bill');
    expect(rowNames()).toEqual(['Billing']);

    search('/Users/me/work/acc');
    expect(rowNames()).toEqual(['Accounts']);

    search('PAY');
    expect(rowNames()).toEqual(['Payments']);
    expect(openButton()).toHaveTextContent('Open 1 collection');

    fireEvent.click(screen.getByTestId('picker-search-clear'));
    expect(rows()).toHaveLength(4);
  });

  it('leaves the divider off only the last row of the list', () => {
    renderPicker();
    const itemFor = (name) => rowFor(name).closest('.collection-picker-item');

    expect(itemFor('Accounts')).toHaveClass('is-last');
    expect(itemFor('Orders')).not.toHaveClass('is-last');

    search('pay');
    expect(itemFor('Payments')).toHaveClass('is-last');
  });

  it('says when nothing matches the search', () => {
    renderPicker();

    search('  zzz ');

    expect(screen.getByText('No collection matches “zzz”.')).toBeInTheDocument();
  });

  it('keeps focus in the search box when the search is cleared', () => {
    renderPicker();
    search('pay');
    const clear = screen.getByTestId('picker-search-clear');
    clear.focus();

    fireEvent.click(clear);

    expect(screen.getByTestId('picker-search')).toHaveFocus();
  });

  it('moves focus to the next control when the selection is cleared', () => {
    renderPicker({ initialSelection: ['/Users/me/work/payments'] });
    const clear = screen.getByTestId('picker-clear-selection');
    clear.focus();

    fireEvent.click(clear);

    expect(screen.getByTestId('picker-cancel')).toHaveFocus();
  });

  it('does not open a collection when its checkbox is double clicked', () => {
    const { onOpen } = renderPicker();

    fireEvent.doubleClick(within(rowFor('Billing')).getByLabelText('Select Billing'));

    expect(onOpen).not.toHaveBeenCalled();
  });

  it('opens one collection from its row without changing the selection', () => {
    const { onOpen } = renderPicker();

    fireEvent.click(within(rowFor('Payments')).getByLabelText('Open Payments'));
    expect(onOpen).toHaveBeenCalledWith(['/Users/me/work/payments']);
    expect(openButton()).toBeDisabled();

    fireEvent.doubleClick(rowFor('Billing'));
    expect(onOpen).toHaveBeenCalledWith(['/Users/me/work/billing']);
  });

  it('chooses other folders and cancels', () => {
    const { onChooseOtherFolders, onCancel } = renderPicker();

    fireEvent.click(screen.getByTestId('picker-choose-other'));
    fireEvent.click(screen.getByTestId('picker-cancel'));

    expect(onChooseOtherFolders).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import SearchLocationsBanner, { MY_COMPUTER_BANNER_DISMISSED_KEY } from './index';

const renderBanner = ({ hasRows = true } = {}) => {
  const onManage = jest.fn();
  render(
    <ThemeProvider theme={themes.light}>
      <button type="button">Choose folder…</button>
      <SearchLocationsBanner onManage={onManage} />
      {hasRows && <button type="button">Open Billing</button>}
    </ThemeProvider>
  );
  return { onManage };
};

const banner = () => screen.queryByRole('region', { name: 'Find collections on this computer' });

describe('SearchLocationsBanner', () => {
  beforeAll(() => {
    Element.prototype.checkVisibility = () => true;
  });

  afterAll(() => {
    delete Element.prototype.checkVisibility;
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('says what the list covers and opens Locations from Manage locations, staying in place', () => {
    const { onManage } = renderBanner();

    expect(banner()).toHaveTextContent('Showing collections from default and workspace folders');
    expect(banner()).toHaveTextContent('Add more folders to find other collections on this computer.');

    fireEvent.click(screen.getByRole('button', { name: 'Manage locations' }));

    expect(onManage).toHaveBeenCalledTimes(1);
    expect(banner()).toBeInTheDocument();
  });

  it('goes away for good when dismissed, moving focus to the next control', () => {
    renderBanner();
    const dismiss = screen.getByRole('button', { name: 'Dismiss' });
    dismiss.focus();

    fireEvent.click(dismiss);

    expect(banner()).not.toBeInTheDocument();
    expect(window.localStorage.getItem(MY_COMPUTER_BANNER_DISMISSED_KEY)).toBe('1');
    expect(screen.getByRole('button', { name: 'Open Billing' })).toHaveFocus();
  });

  it('moves focus back to the control before it when no row follows it yet', () => {
    renderBanner({ hasRows: false });
    const dismiss = screen.getByRole('button', { name: 'Dismiss' });
    dismiss.focus();

    fireEvent.click(dismiss);

    expect(banner()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose folder…' })).toHaveFocus();
  });

  it('stays hidden once it was dismissed before', () => {
    window.localStorage.setItem(MY_COMPUTER_BANNER_DISMISSED_KEY, '1');

    renderBanner();

    expect(banner()).not.toBeInTheDocument();
  });

  it('still shows, and still goes away when dismissed, when the browser blocks its storage', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('The operation is insecure.');
    });
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('The operation is insecure.');
    });
    renderBanner();
    expect(banner()).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(banner()).not.toBeInTheDocument();
  });
});

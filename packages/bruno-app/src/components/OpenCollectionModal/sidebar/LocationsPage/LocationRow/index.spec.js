import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider } from 'providers/Theme';
import LocationRow from './index';

const addedFolder = {
  id: '/Users/me/projects/api',
  kind: 'user',
  path: '/Users/me/projects/api',
  title: '/Users/me/projects/api',
  status: 'done',
  found: 3
};

const renderRow = (row) => {
  const onRemove = jest.fn();
  render(
    <ThemeProvider>
      <LocationRow row={row} onRemove={onRemove} />
      <button type="button">Add folder</button>
    </ThemeProvider>
  );
  return { onRemove };
};

const label = () => screen.getByTestId('locations-row-label');
const status = () => screen.getByTestId('locations-row-status');

describe('LocationRow', () => {
  beforeAll(() => {
    Element.prototype.checkVisibility = () => true;
  });

  afterAll(() => {
    delete Element.prototype.checkVisibility;
  });

  it.each([
    ['the default collection location', { id: '/Users/me/collections', kind: 'default-location', path: '/Users/me/collections', title: '/Users/me/collections' }, 'Default collection location'],
    ['the bruno folder in Documents', { id: '/Users/me/Documents/bruno', kind: 'documents', path: '/Users/me/Documents/bruno', title: '/Users/me/Documents/bruno' }, 'Documents/bruno'],
    ['the open workspace folders', { id: 'all-workspaces', kind: 'workspace', path: null, title: '~/work/team\n~/work/api' }, 'All open workspace folders']
  ])('names %s, shows where it is in the tooltip and offers no way to remove it', (_description, row, text) => {
    renderRow({ ...row, status: 'done', found: 0 });

    expect(label().textContent).toBe(text);
    expect(label()).not.toHaveClass('is-path');
    expect(label()).toHaveAttribute('title', row.title);
    expect(screen.queryByTestId('locations-row-remove')).not.toBeInTheDocument();
  });

  it('shows an added folder by its ~ path in mono, with the full path in the tooltip', () => {
    renderRow(addedFolder);

    expect(label().textContent).toBe('~/projects/api');
    expect(label()).toHaveClass('is-path');
    expect(label()).toHaveAttribute('title', '/Users/me/projects/api');
  });

  it.each([
    ['scanning', 0, 'Scanning…', false],
    ['done', 12, '12 found', false],
    ['done', 0, '0 found', false],
    ['denied', 0, 'No access', true],
    ['missing', 0, 'Not found', true],
    ['idle', 0, 'Not scanned', false]
  ])('shows the %s status with %i found as “%s”', (locationStatus, found, text, isProblem) => {
    renderRow({ ...addedFolder, status: locationStatus, found });

    expect(status().textContent).toBe(text);
    expect(status().classList.contains('is-problem')).toBe(isProblem);
  });

  it('stops looking in an added folder and moves focus to the next control', () => {
    const { onRemove } = renderRow(addedFolder);
    const remove = screen.getByRole('button', { name: 'Stop looking in /Users/me/projects/api' });
    remove.focus();

    fireEvent.click(remove);

    expect(onRemove).toHaveBeenCalledWith('/Users/me/projects/api');
    expect(screen.getByRole('button', { name: 'Add folder' })).toHaveFocus();
  });
});

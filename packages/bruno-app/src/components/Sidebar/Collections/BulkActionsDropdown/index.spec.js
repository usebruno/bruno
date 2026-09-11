import React from 'react';
import { render, screen } from '@testing-library/react';
import { useSelector } from 'react-redux';
import BulkActionsDropdown from './index';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn()
}));

jest.mock('ui/MenuDropdown', () => ({ items, opened }) => {
  if (!opened) return null;
  return (
    <div>
      {items.map((item) => (
        <button key={item.id} data-testid={`menu-${item.id}`}>
          {item.label}
        </button>
      ))}
    </div>
  );
});

describe('BulkActionsDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows Delete option for an app-only selection', () => {
    useSelector.mockImplementation((selector) => {
      const state = {
        collections: {
          selectedSidebarUids: ['app1'],
          collections: [
            {
              uid: 'c1',
              pathname: '/c1',
              items: [
                { uid: 'app1', type: 'app', pathname: '/c1/app1' }
              ]
            }
          ]
        },
        workspaces: {
          workspaces: []
        }
      };
      return selector(state);
    });

    render(<BulkActionsDropdown visible={true} />);

    expect(screen.getByTestId('menu-delete')).toBeInTheDocument();
  });
});

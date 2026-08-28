import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import DeleteCollectionItem from './index';

jest.mock('components/Modal', () => {
  const React = require('react');

  return function MockModal({ children, title }) {
    return (
      <div role="dialog" aria-label={title}>
        {children}
      </div>
    );
  };
});

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  deleteItem: jest.fn(),
  closeTabs: jest.fn()
}));

jest.mock('utils/collections', () => ({
  recursivelyGetAllItemUids: jest.fn(() => [])
}));

describe('DeleteCollectionItem', () => {
  it('allows long request names to wrap inside the delete confirmation modal', () => {
    const longRequestName
      = 'https://apis.data.go/B552584/EvCharger/helloworlld?serviceKey=ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff&zcode=11&numOfRows=10&pageNo=1&dataType=JSON';

    render(
      <DeleteCollectionItem
        onClose={jest.fn()}
        collectionUid="collection-1"
        item={{
          uid: 'request-1',
          type: 'http-request',
          request: {},
          name: longRequestName
        }}
      />
    );

    const requestName = screen.getByText(longRequestName);

    expect(requestName).toHaveClass('delete-item-name');
    expect(document.head.textContent.replace(/\s/g, '')).toContain('overflow-wrap:anywhere');
  });
});

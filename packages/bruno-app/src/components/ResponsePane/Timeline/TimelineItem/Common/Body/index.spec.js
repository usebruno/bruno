import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import QueryResponse from 'components/ResponsePane/QueryResponse/index';
import BodyBlock from './index';

jest.mock('components/ResponsePane/QueryResponse/index', () => jest.fn(() => <div data-testid="query-response" />));

describe('Timeline BodyBlock', () => {
  beforeEach(() => QueryResponse.mockClear());

  it('renders the response view for a body held back for size', () => {
    render(<BodyBlock item={{ uid: 'item-1' }} data={null} dataBuffer="" type="response" isBodyNotLoaded />);

    expect(screen.getByTestId('query-response')).toBeInTheDocument();
  });

  it('says there is no body when there is none', () => {
    render(<BodyBlock item={{ uid: 'item-1' }} data={null} dataBuffer="" type="response" />);

    expect(screen.getByText('No Body')).toBeInTheDocument();
    expect(QueryResponse).not.toHaveBeenCalled();
  });
});

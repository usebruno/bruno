import React from 'react';
import { render } from '@testing-library/react';
import RunnerResults from './index';

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn()
}));

jest.mock('utils/collections', () => ({
  areItemsLoading: jest.fn(() => false),
  findItemInCollection: jest.fn(() => ({
    uid: 'request-1',
    name: 'Request 1',
    type: 'http-request',
    pathname: '/collection/request-1.bru',
    request: {
      tags: []
    }
  })),
  getTotalRequestCountInCollection: jest.fn(() => 1)
}));

jest.mock('providers/ReduxStore/slices/collections/actions', () => ({
  cancelRunnerExecution: jest.fn(),
  mountCollection: jest.fn(),
  runCollectionFolder: jest.fn(),
  updateRunnerConfiguration: jest.fn()
}));

jest.mock('providers/ReduxStore/slices/collections', () => ({
  resetCollectionRunner: jest.fn()
}));

jest.mock('./ResponsePane', () => () => <div data-testid="runner-response-pane" />);
jest.mock('./RunnerTags/index', () => () => <div data-testid="runner-tags" />);
jest.mock('./RunConfigurationPanel', () => () => <div data-testid="runner-config-panel" />);
jest.mock('./StyledWrapper', () => ({ children, ...props }) => <div {...props}>{children}</div>);
jest.mock('ui/Button/index', () => ({ children, ...props }) => {
  const { color, size, variant, ...buttonProps } = props;
  return <button {...buttonProps}>{children}</button>;
});

const collection = {
  uid: 'collection-1',
  pathname: '/collection',
  mountStatus: 'mounted',
  runnerResult: {
    info: {
      status: 'running',
      cancelTokenUid: 'cancel-token-1'
    },
    items: [
      {
        uid: 'request-1',
        status: 'running'
      }
    ]
  }
};

describe('RunnerResults', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = jest.fn();
  });

  it('uses the runner loading icon class for in-progress requests', () => {
    const { container } = render(<RunnerResults collection={collection} />);

    const loadingIcon = container.querySelector('svg.runner-loading-icon');

    expect(loadingIcon).toBeInTheDocument();
    expect(loadingIcon).not.toHaveClass('animate-spin');
  });
});

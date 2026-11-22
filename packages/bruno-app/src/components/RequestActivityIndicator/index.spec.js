import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { useSelector } from 'react-redux';
import RequestActivityIndicator from './index';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

const theme = {
  font: { size: { sm: '12px' } },
  requestTabPanel: { responseOk: 'green', responseError: 'red' }
};

const renderIndicator = (item, hasUnseenResponse = true) => {
  useSelector.mockImplementation((select) => select({ tabs: { unseenResponses: { r1: hasUnseenResponse } } }));
  return render(
    <ThemeProvider theme={theme}>
      <RequestActivityIndicator item={{ uid: 'r1', ...item }} />
    </ThemeProvider>
  );
};

describe('RequestActivityIndicator', () => {
  it('shows a spinner while the request runs', () => {
    renderIndicator({ requestState: 'sending', response: { status: 200 } });
    expect(screen.getByTestId('request-running-indicator')).toHaveAttribute('title', 'Request is running');
    expect(screen.queryByTestId('unseen-response-badge')).not.toBeInTheDocument();
  });

  it('shows the status code of an unseen response', () => {
    renderIndicator({ requestState: 'received', response: { status: 200, statusText: 'OK' } });
    expect(screen.getByTestId('unseen-response-badge')).toHaveTextContent(/^200$/);
  });

  it('shows ERR for a failed request', () => {
    renderIndicator({ requestState: 'received', response: { status: 'Error', isError: true } });
    expect(screen.getByTestId('unseen-response-badge')).toHaveTextContent('ERR');
  });

  it('renders nothing once the response has been seen', () => {
    const { container } = renderIndicator({ requestState: 'received', response: { status: 200 } }, false);
    expect(container).toBeEmptyDOMElement();
  });
});

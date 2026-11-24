import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { useSelector } from 'react-redux';
import { IconAlertTriangle, IconCheck } from '@tabler/icons';
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

  it('shows an icon titled with the status of an unseen response', () => {
    renderIndicator({ requestState: 'received', response: { status: 404 } });
    expect(screen.getByTestId('unseen-response-badge')).toHaveAttribute('title', 'Response: 404');
    expect(screen.getByTestId('unseen-response-badge').querySelector('svg')).toBeInTheDocument();
  });

  // The colour follows the response pane's status code, which only colours 2xx and 5xx
  const statusClasses = [
    [100, 'an uncoloured warning', IconAlertTriangle, ''],
    [200, 'a green check', IconCheck, 'green'],
    [300, 'an uncoloured warning', IconAlertTriangle, ''],
    [400, 'an uncoloured warning', IconAlertTriangle, ''],
    [500, 'a red warning', IconAlertTriangle, 'red']
  ];
  // The first and last code of each class, e.g. 200 and 299
  const statusClassBoundaries = statusClasses.flatMap(([firstStatus, ...expected]) => [
    [{ status: firstStatus }, ...expected],
    [{ status: firstStatus + 99 }, ...expected]
  ]);

  it.each([
    ...statusClassBoundaries,
    [{ status: 'Error', isError: true }, 'an uncoloured warning', IconAlertTriangle, '']
  ])('shows an unseen %o response as %s', (response, _description, Icon, color) => {
    renderIndicator({ requestState: 'received', response });
    const badge = screen.getByTestId('unseen-response-badge');
    // Compare the drawn shape only, so size and stroke width stay free to change
    const expectedShape = render(<Icon />).container.querySelector('svg').innerHTML;
    expect(badge.querySelector('svg').innerHTML).toBe(expectedShape);
    expect(getComputedStyle(badge).color).toBe(color);
  });

  it('renders nothing once the response has been seen', () => {
    const { container } = renderIndicator({ requestState: 'received', response: { status: 200 } }, false);
    expect(container).toBeEmptyDOMElement();
  });
});

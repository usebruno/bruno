import '@testing-library/jest-dom';
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import SourceApprovalBanner from './index';

const renderBanner = (sourceState, handlers = {}) => {
  const onApprove = handlers.onApprove || jest.fn();
  const onDismiss = handlers.onDismiss || jest.fn();
  const utils = render(
    <ThemeProvider theme={themes.light}>
      <SourceApprovalBanner sourceState={sourceState} isBusy={false} onApprove={onApprove} onDismiss={onDismiss} />
    </ThemeProvider>
  );
  return { ...utils, onApprove, onDismiss };
};

describe('SourceApprovalBanner', () => {
  it('shows the full source and warns when it points to a private address', () => {
    const { getByTestId } = renderBanner({ status: 'pending', source: 'http://127.0.0.1:4825/openapi.json', kind: 'url', isLocalOrPrivate: true });

    expect(getByTestId('openapi-sync-source-url')).toHaveTextContent('http://127.0.0.1:4825/openapi.json');
    expect(getByTestId('openapi-sync-source-warning')).toHaveTextContent('your computer or a private network');
  });

  it('warns that a file source reads a file on this computer', () => {
    const { getByTestId } = renderBanner({ status: 'pending', source: '/home/me/spec.yaml', kind: 'file', isLocalOrPrivate: true });

    expect(getByTestId('openapi-sync-source-warning')).toHaveTextContent('reads a file on your computer');
  });

  it('shows no warning for a public url', () => {
    const { queryByTestId } = renderBanner({ status: 'pending', source: 'https://api.example.com/openapi.json', kind: 'url', isLocalOrPrivate: false });

    expect(queryByTestId('openapi-sync-source-warning')).not.toBeInTheDocument();
  });

  it('approves with the chosen auto check setting', () => {
    const { getByTestId, onApprove } = renderBanner({ status: 'pending', source: 'https://api.example.com/openapi.json', kind: 'url', isLocalOrPrivate: false });

    fireEvent.click(getByTestId('openapi-sync-source-auto-check'));
    fireEvent.click(getByTestId('openapi-sync-source-approve'));

    expect(onApprove).toHaveBeenCalledWith({ autoCheck: false, autoCheckInterval: 5 });
  });

  it('dismisses a pending source, and offers only approve once dismissed', () => {
    const pending = renderBanner({ status: 'pending', source: 'https://api.example.com/openapi.json', kind: 'url', isLocalOrPrivate: false });
    fireEvent.click(pending.getByTestId('openapi-sync-source-dismiss'));
    expect(pending.onDismiss).toHaveBeenCalled();
    pending.unmount();

    const dismissed = renderBanner({ status: 'dismissed', source: 'https://api.example.com/openapi.json', kind: 'url', isLocalOrPrivate: false });
    expect(dismissed.queryByTestId('openapi-sync-source-dismiss')).not.toBeInTheDocument();
    expect(dismissed.getByText('Sync is off for this collection')).toBeInTheDocument();
  });
});

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import OnExitModal from './OnExitModal';

jest.mock('components/Modal', () => ({ children }) => <div>{children}</div>);
jest.mock('ui/Button', () => ({ children, onClick }) => <button onClick={onClick}>{children}</button>);

const plans = [{
  collectionUid: 'collection-1',
  collectionName: 'Test API',
  showReminder: true,
  reminderMessage: 'Disconnect the shared test account.',
  requests: [{ uid: 'request-1', name: 'Delete session' }],
  missingRequestPaths: []
}];

describe('OnExitModal', () => {
  it('shows collection cleanup requests and lets the user run or skip them', () => {
    const onRun = jest.fn();
    const onSkip = jest.fn();
    render(<OnExitModal plans={plans} status="idle" onCancel={jest.fn()} onRun={onRun} onSkip={onSkip} />);

    expect(screen.getByText('Disconnect the shared test account.')).toBeInTheDocument();
    expect(screen.getByText(/Delete session/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Run cleanup and quit' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quit without cleanup' }));
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('shows the request currently running and keeps cancellation and quit actions available', () => {
    const onCancelRun = jest.fn();
    const onSkip = jest.fn();
    render(
      <OnExitModal
        plans={plans}
        status="running"
        currentRequest="Test API — Delete session"
        onCancel={jest.fn()}
        onCancelRun={onCancelRun}
        onRun={jest.fn()}
        onSkip={onSkip}
      />
    );

    expect(screen.getByText('Running cleanup requests…')).toBeInTheDocument();
    expect(screen.getByText('Test API — Delete session')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel cleanup' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quit without cleanup' }));
    expect(onCancelRun).toHaveBeenCalledTimes(1);
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('shows failures and offers a retry', () => {
    render(
      <OnExitModal
        plans={plans}
        status="error"
        error="cleanup request failed"
        onCancel={jest.fn()}
        onRun={jest.fn()}
        onSkip={jest.fn()}
      />
    );

    expect(screen.getByText('cleanup request failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry cleanup' })).toBeInTheDocument();
  });
});

import React from 'react';
import { IconAlertTriangle, IconCircleCheck, IconLoader2 } from '@tabler/icons';
import Modal from 'components/Modal';
import Button from 'ui/Button';

const OnExitModal = ({ plans, status, error, currentRequest, onCancel, onCancelRun, onRun, onSkip }) => {
  const requestCount = plans.reduce(
    (count, plan) => count + plan.requests.length + plan.missingRequestPaths.length,
    0
  );
  const isRunning = status === 'running';

  return (
    <Modal
      size="md"
      title="Before quitting Bruno"
      handleCancel={isRunning ? onCancelRun : onCancel}
      disableEscapeKey={false}
      disableCloseOnOutsideClick={true}
      hideClose={false}
      hideFooter={true}
      dataTestId="on-exit-modal"
    >
      <div className="flex items-start">
        {status === 'complete' ? (
          <IconCircleCheck size={30} strokeWidth={1.5} className="text-green-600 shrink-0" />
        ) : isRunning ? (
          <IconLoader2 size={30} strokeWidth={1.5} className="animate-spin shrink-0" />
        ) : (
          <IconAlertTriangle size={30} strokeWidth={1.5} className="text-yellow-600 shrink-0" />
        )}
        <div className="ml-3 min-w-0 flex-1">
          {plans.filter((plan) => plan.showReminder).map((plan) => (
            <div className="mb-3" key={plan.collectionUid}>
              <p className="font-medium">{plan.collectionName}</p>
              <p className="whitespace-pre-wrap break-words text-muted">
                {plan.reminderMessage || 'Run this collection’s cleanup requests before quitting Bruno.'}
              </p>
            </div>
          ))}

          {requestCount > 0 && status === 'idle' && (
            <div className="mt-3">
              <p>Bruno will run {requestCount} cleanup {requestCount === 1 ? 'request' : 'requests'} sequentially:</p>
              <ul className="mt-2 text-xs">
                {plans.flatMap((plan) => [
                  ...plan.requests.map((request) => (
                    <li className="mt-1" key={`${plan.collectionUid}-${request.uid}`}>
                      {plan.collectionName} — {request.name || request.filename}
                    </li>
                  )),
                  ...plan.missingRequestPaths.map((requestPath) => (
                    <li className="mt-1 text-red-500" key={`${plan.collectionUid}-${requestPath}`}>
                      {plan.collectionName} — Missing cleanup request ({requestPath})
                    </li>
                  ))
                ])}
              </ul>
            </div>
          )}

          {isRunning && (
            <div>
              <p>Running cleanup requests…</p>
              {currentRequest && <p className="mt-1 text-xs text-muted">{currentRequest}</p>}
            </div>
          )}

          {error && (
            <div className="mt-3">
              <p className="font-medium text-red-500">Cleanup failed. Bruno will remain open.</p>
              <pre className="mt-2 p-2 rounded bg-gray-100 dark:bg-gray-800 text-xs whitespace-pre-wrap break-words max-h-40 overflow-auto">
                {error}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mt-6 gap-3">
        <Button color="secondary" variant="ghost" onClick={isRunning ? onCancelRun : onCancel}>
          {isRunning ? 'Cancel cleanup' : 'Cancel'}
        </Button>
        {isRunning ? (
          <Button color="danger" variant="ghost" onClick={onSkip}>Quit without cleanup</Button>
        ) : (
          <div className="flex gap-2">
            {requestCount > 0 && (
              <Button color="danger" variant="ghost" onClick={onSkip}>Quit without cleanup</Button>
            )}
            <Button onClick={requestCount > 0 ? onRun : onSkip}>
              {requestCount > 0 ? (error ? 'Retry cleanup' : 'Run cleanup and quit') : 'Quit Bruno'}
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default OnExitModal;

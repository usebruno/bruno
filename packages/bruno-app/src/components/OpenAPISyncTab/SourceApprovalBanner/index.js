import { useState } from 'react';
import { IconAlertTriangle, IconShieldLock } from '@tabler/icons';
import Button from 'ui/Button';
import Checkbox from 'ui/Checkbox';
import Select from 'ui/Select';
import { AUTO_CHECK_INTERVALS } from '../utils';
import StyledWrapper from './StyledWrapper';

const INTERVAL_OPTIONS = AUTO_CHECK_INTERVALS.map((mins) => ({ value: String(mins), label: `${mins} min` }));

const describeLocation = ({ kind, isLocalOrPrivate }) => {
  if (kind === 'network-share') {
    return 'This reads a file from a network share, so your computer connects to that server.';
  }
  if (kind === 'file') {
    return 'This reads a file on your computer.';
  }
  return isLocalOrPrivate ? 'This points to your computer or a private network.' : null;
};

const SourceApprovalBanner = ({ sourceState, isBusy, onApprove, onDismiss }) => {
  const [autoCheck, setAutoCheck] = useState(true);
  const [autoCheckInterval, setAutoCheckInterval] = useState('5');
  const locationWarning = describeLocation(sourceState);
  const isDismissed = sourceState.status === 'dismissed';

  return (
    <StyledWrapper className="flex flex-col gap-3 mt-5 px-4 py-3.5 rounded-lg" role="region" aria-label="Review sync source" data-testid="openapi-sync-source-approval">
      <div className="flex gap-2.5">
        <IconShieldLock size={18} className="source-approval-icon shrink-0 mt-px" aria-hidden="true" />
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="source-approval-title font-semibold">
            {isDismissed ? 'Sync is off for this collection' : 'Review this sync source before Bruno uses it'}
          </div>
          <div className="source-approval-description">
            This collection syncs its requests from the source below. Bruno won’t contact it until you approve it on this computer.
          </div>
          <code className="source-approval-url self-start max-w-full px-1.5 py-0.5 rounded break-all" data-testid="openapi-sync-source-url">{sourceState.source}</code>
          {locationWarning && (
            <div className="source-approval-warning flex items-center gap-1.5" data-testid="openapi-sync-source-warning">
              <IconAlertTriangle size={14} aria-hidden="true" />
              <span>{locationWarning} Only approve it if you expected this.</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pl-7">
        <Checkbox
          checked={autoCheck}
          onChange={(event) => setAutoCheck(event.target.checked)}
          label="Check for updates automatically"
          data-testid="openapi-sync-source-auto-check"
        />
        {autoCheck && (
          <div className="source-approval-interval flex items-center gap-1.5">
            <span>every</span>
            <Select
              data={INTERVAL_OPTIONS}
              value={autoCheckInterval}
              onChange={(value) => value && setAutoCheckInterval(value)}
              allowDeselect={false}
              size="sm"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        {!isDismissed && (
          <Button variant="ghost" size="sm" onClick={onDismiss} disabled={isBusy} data-testid="openapi-sync-source-dismiss">
            Dismiss
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => onApprove({ autoCheck, autoCheckInterval: Number(autoCheckInterval) })}
          loading={isBusy}
          data-testid="openapi-sync-source-approve"
        >
          Approve source
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default SourceApprovalBanner;

import React from 'react';
import { useSelector } from 'react-redux';
import { IconAlertTriangle, IconCheck, IconRefresh } from '@tabler/icons';
import { getStatusCodeClassname } from 'components/ResponsePane/StatusCode';
import StatusCodeWrapper from 'components/ResponsePane/StatusCode/StyledWrapper';

const isRequestRunning = (item) => ['queued', 'sending'].includes(item?.requestState);

// Whether the request runs or has a response the user has not seen yet.
export const useHasRequestActivity = (item) => {
  const hasUnseenResponse = useSelector((state) => !!state.tabs.unseenResponses[item?.uid]);
  return isRequestRunning(item) || (hasUnseenResponse && !!item.response);
};

// A spinner while the request runs, then a check (2xx) or warning (anything else), coloured like the response pane's status code.
const RequestActivityIndicator = ({ item }) => {
  const hasActivity = useHasRequestActivity(item);
  if (!hasActivity) return null;

  if (isRequestRunning(item)) {
    return (
      <span className="flex" title="Request is running" data-testid="request-running-indicator">
        {/* Same icon and spin as the response pane's loading overlay; the keyframes live in globalStyles */}
        <IconRefresh className="motion-safe:animate-[rotateCounterClockwise_1s_linear_infinite]" size={14} strokeWidth={2} />
      </span>
    );
  }

  const { status } = item.response;
  const Icon = getStatusCodeClassname(status) === 'text-ok' ? IconCheck : IconAlertTriangle;
  // Coloured exactly like the response pane's status code; the icon strokes in currentColor
  return (
    <StatusCodeWrapper as="span" className={`flex ${getStatusCodeClassname(status)}`} title={`Response: ${status}`} data-testid="unseen-response-badge">
      <Icon size={16} strokeWidth={2} />
    </StatusCodeWrapper>
  );
};

export default RequestActivityIndicator;

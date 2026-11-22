import React from 'react';
import { useSelector } from 'react-redux';
import { IconRefresh } from '@tabler/icons';
import StatusCode from 'components/ResponsePane/StatusCode';

const isRequestRunning = (item) => ['queued', 'sending'].includes(item?.requestState);

// Whether the request runs or has a response the user has not seen yet.
export const useHasRequestActivity = (item) => {
  const hasUnseenResponse = useSelector((state) => !!state.tabs.unseenResponses[item?.uid]);
  return isRequestRunning(item) || (hasUnseenResponse && !!item.response);
};

// A spinner while the request runs, then its status code until the user has seen the response.
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

  const { status, isError } = item.response;
  return <StatusCode status={isError ? 'ERR' : status} compact data-testid="unseen-response-badge" />;
};

export default RequestActivityIndicator;

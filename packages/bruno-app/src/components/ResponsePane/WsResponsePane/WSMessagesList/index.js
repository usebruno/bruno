import React from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import { IconArrowDown, IconArrowUp } from '@tabler/icons';

// Example message structure: { direction: 'incoming' | 'outgoing', timestamp, data }
const WSMessagesList = ({ messages = [] }) => {
  if (!messages.length) {
    return <div className="p-4 text-gray-500">No messages yet.</div>;
  }

  return (
    <StyledWrapper className="ws-messages-list flex flex-col gap-2 mt-4">
      {messages.map((msg, idx) => {
        const isIncoming = msg.direction === 'incoming';
        let content;
        try {
          content = typeof msg.message === 'string' ? msg.message : JSON.stringify(msg.message, null, 2);
        } catch {
          content = String(msg.message);
        }
        return (
          <div
            key={idx}
            className={classnames('ws-message flex flex-col rounded border p-2', {
              'ws-incoming': isIncoming,
              'ws-outgoing': !isIncoming
            })}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className={classnames(
                  'font-semibold flex items-center gap-1',
                  isIncoming ? 'text-blue-700' : 'text-green-700'
                )}
              >
                {isIncoming ? <IconArrowDown size={18} /> : <IconArrowUp size={18} />}
                {isIncoming ? 'RCVD' : 'SENT'}
              </span>
              {msg.timestamp && (
                <span className="text-xs text-gray-400">{new Date(msg.timestamp).toLocaleTimeString()}</span>
              )}
            </div>
            <pre className="whitespace-pre-wrap break-all text-sm">{content}</pre>
          </div>
        );
      })}
    </StyledWrapper>
  );
};

export default WSMessagesList;

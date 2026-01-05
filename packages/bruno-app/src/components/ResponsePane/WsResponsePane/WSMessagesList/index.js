import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import { IconExclamationCircle, IconChevronRight, IconInfoCircle, IconChevronDown, IconArrowUpRight, IconArrowDownLeft } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor/index';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';

const getContentMeta = (content) => {
  if (typeof content === 'object') {
    return {
      isJSON: true,
      content: JSON.stringify(content, null, 0)
    };
  }
  try {
    return {
      isJSON: true,
      content: JSON.stringify(JSON.parse(content), null, 0)
    };
  } catch {
    return {
      isJSON: false,
      content: content
    };
  }
};

const parseContent = (content) => {
  let contentMeta = getContentMeta(content);
  return {
    type: contentMeta.isJSON ? 'application/json' : 'text/plain',
    content: contentMeta.isJSON ? JSON.stringify(JSON.parse(contentMeta.content), null, 2) : contentMeta.content
  };
};

const getDataTypeText = (type) => {
  const textMap = {
    'text/plain': 'RAW',
    'application/json': 'JSON'
  };
  return textMap[type] ?? 'RAW';
};

/**
 *
 * @param {"incoming"|"outgoing"|"info"} type
 */
const TypeIcon = ({ type }) => {
  const commonProps = {
    size: 18
  };
  return {
    incoming: <IconArrowDownLeft {...commonProps} />,
    outgoing: <IconArrowUpRight {...commonProps} />,
    info: <IconInfoCircle {...commonProps} />,
    error: <IconExclamationCircle {...commonProps} />
  }[type];
};

const WSMessageItem = memo(({ message, isOpen, onToggle }) => {
  const [showHex, setShowHex] = useState(false);
  const preferences = useSelector((state) => state.app.preferences);
  const { displayedTheme } = useTheme();
  const [isNew, setIsNew] = useState(false);
  const notified = useRef(false);

  const isIncoming = message.type === 'incoming';
  const isInfo = message.type === 'info';
  const isError = message.type === 'error';
  const isOutgoing = message.type === 'outgoing';
  let contentHexdump = message.messageHexdump;
  let parsedContent = parseContent(message.message);
  const dataType = getDataTypeText(parsedContent.type);

  useEffect(() => {
    if (notified.current === true) return;
    const dateDiff = Date.now() - new Date(message.timestamp).getTime();
    if (dateDiff < 1000 * 10) {
      setIsNew(true);
      const timer = setTimeout(() => {
        notified.current = true;
        setIsNew(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [message.timestamp]);

  const canOpenMessage = !isInfo && !isError;

  const handleToggle = () => {
    if (!canOpenMessage) return;
    onToggle?.(message.timestamp);
  };

  return (
    <div
      className={classnames('ws-message flex flex-col p-2', {
        'ws-incoming': isIncoming,
        'ws-outgoing': isOutgoing,
        'ws-info': isInfo,
        'ws-error': isError,
        'open': isOpen,
        'new': isNew
      })}
    >
      <div
        className={classnames('flex items-center justify-between', {
          'cursor-pointer': canOpenMessage,
          'cursor-not-allowed': !canOpenMessage
        })}
        onClick={handleToggle}
      >
        <div className="flex min-w-0 shrink">
          <span className="message-type-icon">
            <TypeIcon type={message.type} />
          </span>
          <span className="ml-3 text-ellipsis max-w-full overflow-hidden text-nowrap message-content">{parsedContent.content}</span>
        </div>
        <div className="flex shrink-0 gap-2 items-center">
          {message.timestamp && (
            <span className="message-timestamp">{new Date(message.timestamp).toISOString()}</span>
          )}
          {canOpenMessage
            ? (
                <span className="chevron-icon">
                  {isOpen ? (
                    <IconChevronDown size={16} strokeWidth={1.5} />
                  ) : (
                    <IconChevronRight size={16} strokeWidth={1.5} />
                  )}
                </span>
              )
            : <span className="w-4"></span>}
        </div>
      </div>
      {isOpen && (
        <>
          <div className="mt-2 flex justify-end gap-2 text-xs ws-message-toolbar" role="tablist">
            <div
              className={classnames('select-none capitalize', {
                'active': showHex,
                'cursor-pointer': !showHex
              })}
              role="tab"
              onClick={() => setShowHex(true)}
            >
              hexdump
            </div>
            <div
              className={classnames('select-none capitalize', {
                'active': !showHex,
                'cursor-pointer': showHex
              })}
              role="tab"
              onClick={() => setShowHex(false)}
            >
              {dataType.toLowerCase()}
            </div>
          </div>
          <div className="mt-1 h-[300px] w-full">
            <CodeEditor
              mode={showHex ? 'text/plain' : parsedContent.type}
              theme={displayedTheme}
              enableLineWrapping={showHex ? false : true}
              font={preferences.codeFont || 'default'}
              value={showHex ? contentHexdump : parsedContent.content}
            />
          </div>
        </>
      )}
    </div>
  );
});

const WSMessagesList = ({ messages = [] }) => {
  const virtuosoRef = useRef(null);
  const [openMessages, setOpenMessages] = useState(new Set());
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Use ref for immediate access in effects (avoids state timing issues)
  const openMessagesRef = useRef(openMessages);
  openMessagesRef.current = openMessages;

  // Toggle message open/closed state by timestamp
  const handleMessageToggle = useCallback((timestamp) => {
    setOpenMessages((prev) => {
      const next = new Set(prev);
      if (next.has(timestamp)) {
        next.delete(timestamp);
      } else {
        next.add(timestamp);
      }
      return next;
    });
  }, []);

  // Track when user scrolls away from bottom
  const handleAtBottomStateChange = useCallback((atBottom) => {
    setIsAtBottom(atBottom);
  }, []);

  // Auto-scroll enabled when no messages are open AND user is at bottom
  const shouldAutoScroll = openMessagesRef.current.size === 0 && isAtBottom;

  const renderItem = useCallback((index) => {
    const msg = messages[index];
    const isOpen = openMessages.has(msg.timestamp);
    return <WSMessageItem key={msg.timestamp} message={msg} isOpen={isOpen} onToggle={handleMessageToggle} />;
  }, [messages, openMessages, handleMessageToggle]);

  if (!messages.length) {
    return <StyledWrapper><div className="empty-state">No messages yet.</div></StyledWrapper>;
  }

  // sort based on order, seq was newly added and might be missing in some cases and when missing,
  // the timestamp will be used instead
  const ordered = messages.toSorted((x, y) => ((x.seq ?? x.timestamp) - (y.seq ?? y.timestamp)) * (-order));

  return (
    <StyledWrapper className="ws-messages-list flex flex-col">
      {ordered.map((msg, idx, src) => {
        const inFocus = order === -1 ? src.length - 1 === idx : idx === 0;
        return <WSMessageItem key={msg.seq ? msg.seq : msg.timestamp} inFocus={inFocus} id={idx} message={msg} />;
      })}
    </StyledWrapper>
  );
};

export default WSMessagesList;

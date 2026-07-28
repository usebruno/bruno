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
  const contentMeta = getContentMeta(content);
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

const GraphqlSubscriptionMessageItem = memo(({ message, messageKey, isOpen, onToggle }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const { displayedTheme } = useTheme();
  const [isNew, setIsNew] = useState(false);
  const notified = useRef(false);

  const isIncoming = message.type === 'incoming';
  const isInfo = message.type === 'info';
  const isError = message.type === 'error';
  const isOutgoing = message.type === 'outgoing';
  const parsedContent = parseContent(message.message);
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
    onToggle?.(messageKey);
  };

  return (
    <div
      className={classnames('gql-subscription-message flex flex-col p-2', {
        'gql-subscription-incoming': isIncoming,
        'gql-subscription-outgoing': isOutgoing,
        'gql-subscription-info': isInfo,
        'gql-subscription-error': isError,
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
      {isOpen && canOpenMessage && (
        <>
          <div className="mt-2 flex justify-end text-xs message-datatype capitalize">
            {dataType.toLowerCase()}
          </div>
          <div className="mt-1 h-[300px] w-full">
            <CodeEditor
              mode={parsedContent.type}
              theme={displayedTheme}
              enableLineWrapping={true}
              font={preferences.codeFont || 'default'}
              value={parsedContent.content}
            />
          </div>
        </>
      )}
    </div>
  );
});

// Matches computeItemKey below — messages don't have a stable id of their own,
// and plain timestamp collides whenever two entries land in the same millisecond
// (a burst of `next` frames, or an info entry pushed alongside one). Toggling one
// message must never open/close an unrelated message that happens to share a key.
const getMessageKey = (msg) => msg.seq ?? msg.timestamp;

const GraphqlSubscriptionMessagesList = ({ messages = [] }) => {
  const virtuosoRef = useRef(null);
  const [scrollerElement, setScrollerElement] = useState(null);
  const [openMessages, setOpenMessages] = useState(new Set());
  const userScrolledAwayRef = useRef(false);

  const handleMessageToggle = useCallback((key) => {
    setOpenMessages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!scrollerElement) return;

    const handleWheel = (e) => {
      // deltaY < 0 means scrolling up
      if (e.deltaY < 0) {
        userScrolledAwayRef.current = true;
      }
    };

    scrollerElement.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      scrollerElement.removeEventListener('wheel', handleWheel);
    };
  }, [scrollerElement]);

  const handleAtBottomStateChange = useCallback((atBottom) => {
    if (atBottom) {
      // User scrolled back to bottom, re-enable auto-scroll
      userScrolledAwayRef.current = false;
    }
  }, []);

  const followOutput = useCallback((isAtBottom) => {
    // Don't auto-scroll if user has scrolled away or has messages open
    if (userScrolledAwayRef.current || openMessages.size > 0) {
      return false;
    }
    if (isAtBottom) {
      return 'smooth';
    }
    return false;
  }, [openMessages.size]);

  const renderItem = useCallback((_, msg) => {
    const key = getMessageKey(msg);
    const isOpen = openMessages.has(key);
    return <GraphqlSubscriptionMessageItem message={msg} messageKey={key} isOpen={isOpen} onToggle={handleMessageToggle} />;
  }, [openMessages, handleMessageToggle]);

  const computeItemKey = useCallback((_, msg) => {
    return getMessageKey(msg);
  }, []);

  if (!messages.length) {
    return <StyledWrapper><div className="empty-state">No messages yet.</div></StyledWrapper>;
  }

  return (
    <StyledWrapper className="gql-subscription-messages-list flex flex-col">
      <Virtuoso
        ref={virtuosoRef}
        scrollerRef={setScrollerElement}
        data={messages}
        itemContent={renderItem}
        computeItemKey={computeItemKey}
        followOutput={followOutput}
        initialTopMostItemIndex={messages.length - 1}
        atBottomStateChange={handleAtBottomStateChange}
      />
    </StyledWrapper>
  );
};

export default GraphqlSubscriptionMessagesList;

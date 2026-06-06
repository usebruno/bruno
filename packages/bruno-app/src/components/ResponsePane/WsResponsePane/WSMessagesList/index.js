import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { hexy as hexdump } from 'hexy';
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

const WSMessageItem = memo(({ message, onOpenChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHex, setShowHex] = useState(false);
  const codeFont = useSelector((state) => state.app.preferences?.codeFont);
  const { displayedTheme } = useTheme();
  const [isNew, setIsNew] = useState(false);
  const notified = useRef(false);

  const isIncoming = message.type === 'incoming';
  const isInfo = message.type === 'info';
  const isError = message.type === 'error';
  const isOutgoing = message.type === 'outgoing';
  const canOpenMessage = !isInfo && !isError;

  // Parsed content is memoized — avoids JSON.parse/stringify on every render.
  const parsedContent = useMemo(() => parseContent(message.message), [message.message]);
  const dataType = getDataTypeText(parsedContent.type);
  // Hexdump is computed lazily — only when the message is expanded and the hex tab is active.
  const contentHexdump = useMemo(() => (showHex ? hexdump(message.message) : null), [showHex, message.message]);

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

  const handleToggle = useCallback(() => {
    if (!canOpenMessage) return;
    setIsOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next ? 1 : -1);
      return next;
    });
  }, [canOpenMessage, onOpenChange]);

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
              font={codeFont || 'default'}
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
  const [scrollerElement, setScrollerElement] = useState(null);
  const userScrolledAwayRef = useRef(false);
  const openCountRef = useRef(0);

  const handleOpenChange = useCallback((delta) => {
    openCountRef.current += delta;
  }, []);

  useEffect(() => {
    if (!scrollerElement) return;

    const handleWheel = (e) => {
      if (e.deltaY < 0) {
        userScrolledAwayRef.current = true;
      }
    };

    scrollerElement.addEventListener('wheel', handleWheel, { passive: true });
    return () => scrollerElement.removeEventListener('wheel', handleWheel);
  }, [scrollerElement]);

  const handleAtBottomStateChange = useCallback((atBottom) => {
    if (atBottom) {
      userScrolledAwayRef.current = false;
    }
  }, []);

  // Fully stable — no state dependencies, reads only refs.
  const followOutput = useCallback((isAtBottom) => {
    if (userScrolledAwayRef.current || openCountRef.current > 0) {
      return false;
    }
    return isAtBottom ? 'smooth' : false;
  }, []);

  // Stable renderItem: WSMessageItem manages its own open/closed state,
  // so toggling one message never re-renders the others.
  const renderItem = useCallback((_, msg) => {
    return <WSMessageItem message={msg} onOpenChange={handleOpenChange} />;
  }, [handleOpenChange]);

  const computeItemKey = useCallback((_, msg) => {
    return msg.seq ?? msg.timestamp;
  }, []);

  if (!messages.length) {
    return <StyledWrapper><div className="empty-state">No messages yet.</div></StyledWrapper>;
  }

  return (
    <StyledWrapper className="ws-messages-list flex flex-col">
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

export default WSMessagesList;

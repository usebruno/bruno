import React, { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';
import { IconExclamationCircle, IconChevronRight, IconInfoCircle, IconChevronDown, IconArrowUpRight, IconArrowDownLeft } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor/index';
import { useTheme } from 'providers/Theme';
import { useSelector } from 'react-redux';
import { Virtuoso } from 'react-virtuoso';
import { formatResponse } from 'utils/common';
import { PREVIEW_FORMAT_OPTIONS } from 'components/ResponsePane/QueryResult/index';
import QueryResultTypeSelector from 'components/ResponsePane/QueryResult/QueryResultTypeSelector/index';
import ErrorBanner from 'ui/ErrorBanner';

const MESSAGE_FORMAT_OPTIONS = PREVIEW_FORMAT_OPTIONS.filter((option) => ['json', 'xml', 'raw', 'hex', 'base64'].includes(option.id));

const extractJsonFromSSE = (content) => {
  if (typeof content !== 'string') return null;
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.startsWith('data:')) {
      const dataStr = line.slice(5).trim();
      try {
        const parsed = JSON.parse(dataStr);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return null;
      }
    }
  }
  return null;
};

const extractJsonPayload = (content) => {
  const ssePayload = extractJsonFromSSE(content);
  if (ssePayload) return ssePayload;

  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return null;
  }
};

const getInitialFormat = (content) => extractJsonPayload(content) ? 'json' : 'raw';

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
const WSMessageItem = memo(({ message, isOpen, onToggle, item, collection }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const { displayedTheme } = useTheme();
  const [isNew, setIsNew] = useState(false);
  const notified = useRef(false);

  const isIncoming = message.type === 'incoming';
  const isInfo = message.type === 'info';
  const isError = message.type === 'error';
  const isOutgoing = message.type === 'outgoing';
  const contentHexdump = message.messageHexdump;

  const rawMessage = typeof message.message === 'string'
    ? message.message
    : (message.message !== null && message.message !== undefined ? String(message.message) : '');
  const jsonPayload = useMemo(() => extractJsonPayload(rawMessage), [rawMessage]);
  const [selectedFormat, setSelectedFormat] = useState(() => getInitialFormat(rawMessage));

  const codeMirrorMode = useMemo(() => {
    return PREVIEW_FORMAT_OPTIONS
      .filter((option) => option.type === 'item' || !option.type)
      .find((option) => option.id === selectedFormat)?.codeMirrorMode || 'text/plain';
  }, [selectedFormat]);

  // Determine display value using formatResponse (same utility as HTTP response path)
  const displayValue = useMemo(() => {
    if (selectedFormat === 'raw') return rawMessage;
    if (selectedFormat === 'hex') return contentHexdump || '';
    if (selectedFormat === 'json' && jsonPayload) return jsonPayload;
    if (selectedFormat === 'base64') return Buffer.from(rawMessage, 'utf-8').toString('base64');
    const dataBuffer = Buffer.from(rawMessage, 'utf-8').toString('base64');
    return formatResponse(rawMessage, dataBuffer, selectedFormat) || rawMessage;
  }, [rawMessage, selectedFormat, contentHexdump, jsonPayload]);

  const isCompatible = useMemo(() => {
    if (selectedFormat === 'json') return jsonPayload !== null;
    if (selectedFormat === 'xml') return !rawMessage || /<[a-zA-Z][\s\S]*>/.test(rawMessage);
    return true;
  }, [rawMessage, selectedFormat, jsonPayload]);

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
      data-testid={isError ? 'ws-message-error' : 'ws-message'}
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
          <span data-testid="ws-message-content" className="ml-3 text-ellipsis max-w-full overflow-hidden text-nowrap message-content">{rawMessage}</span>
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
          <div className="mt-1 flex flex-col gap-1">
            <div className="flex justify-end">
              <QueryResultTypeSelector
                formatOptions={MESSAGE_FORMAT_OPTIONS}
                formatValue={selectedFormat}
                onFormatChange={setSelectedFormat}
                selectedTab="editor"
                isActiveTab={true}
                showPreviewToggle={false}
              />
            </div>
            {isCompatible ? (
              <div className="h-[300px] w-full">
                <CodeEditor
                  mode={codeMirrorMode}
                  theme={displayedTheme}
                  enableLineWrapping={selectedFormat !== 'hex'}
                  font={preferences.codeFont || 'default'}
                  value={displayValue}
                  item={item}
                  collection={collection}
                  readOnly
                />
              </div>
            ) : (
              <ErrorBanner
                errors={[{
                  title: `Cannot format as ${MESSAGE_FORMAT_OPTIONS.find((option) => option.id === selectedFormat)?.label || selectedFormat}`,
                  message: `Invalid ${selectedFormat} format. Try selecting a different format from the dropdown above.`
                }]}
                className="mt-2"
              />
            )}
          </div>
        </>
      )}
    </div>
  );
});

const WSMessagesList = ({ messages = [], item, collection }) => {
  const virtuosoRef = useRef(null);
  const [scrollerElement, setScrollerElement] = useState(null);
  const [openMessages, setOpenMessages] = useState(new Set());
  const userScrolledAwayRef = useRef(false);

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
    const isOpen = openMessages.has(msg.timestamp);
    return (
      <WSMessageItem
        message={msg}
        isOpen={isOpen}
        onToggle={handleMessageToggle}
        item={item}
        collection={collection}
      />
    );
  }, [openMessages, handleMessageToggle, item, collection]);

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

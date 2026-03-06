import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import classnames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import find from 'lodash/find';
import { IconArrowUpRight, IconArrowDownLeft, IconInfoCircle, IconExclamationCircle, IconChevronRight, IconChevronDown, IconTrash } from '@tabler/icons';
import { Virtuoso } from 'react-virtuoso';
import CodeEditor from 'components/CodeEditor/index';
import { useTheme } from 'providers/Theme';
import Placeholder from '../Placeholder';
import ResponseClear from '../ResponseClear';
import StyledWrapper from '../WsResponsePane/StyledWrapper';

const parseContent = (content) => {
  if (typeof content === 'object') {
    return { type: 'application/json', content: JSON.stringify(content, null, 2) };
  }
  try {
    const parsed = JSON.parse(content);
    return { type: 'application/json', content: JSON.stringify(parsed, null, 2) };
  } catch {
    return { type: 'text/plain', content: String(content) };
  }
};

const getPreview = (content) => {
  if (typeof content === 'object') return JSON.stringify(content);
  try {
    return JSON.stringify(JSON.parse(content));
  } catch {
    return String(content);
  }
};

const TypeIcon = ({ type }) => {
  const props = { size: 18 };
  return {
    incoming: <IconArrowDownLeft {...props} />,
    outgoing: <IconArrowUpRight {...props} />,
    info: <IconInfoCircle {...props} />,
    error: <IconExclamationCircle {...props} />
  }[type];
};

const MqttMessageItem = memo(({ message, isOpen, onToggle }) => {
  const preferences = useSelector((state) => state.app.preferences);
  const { displayedTheme } = useTheme();
  const [isNew, setIsNew] = useState(false);
  const notified = useRef(false);

  const isIncoming = message.type === 'incoming';
  const isOutgoing = message.type === 'outgoing';
  const isInfo = message.type === 'info';
  const isError = message.type === 'error';
  const canOpen = !isInfo && !isError;
  const parsedContent = canOpen ? parseContent(message.message) : null;

  useEffect(() => {
    if (notified.current) return;
    const dateDiff = Date.now() - new Date(message.timestamp).getTime();
    if (dateDiff < 10000) {
      setIsNew(true);
      const timer = setTimeout(() => {
        notified.current = true;
        setIsNew(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [message.timestamp]);

  const handleToggle = () => {
    if (canOpen) onToggle?.(message.seq ?? message.timestamp);
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
          'cursor-pointer': canOpen,
          'cursor-not-allowed': !canOpen
        })}
        onClick={handleToggle}
      >
        <div className="flex min-w-0 shrink items-center gap-2">
          <span className="message-type-icon">
            <TypeIcon type={message.type} />
          </span>
          {message.topic && (
            <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 shrink-0 max-w-[200px] truncate" title={message.topic}>
              {message.topic}
            </span>
          )}
          <span className="ml-1 text-ellipsis max-w-full overflow-hidden text-nowrap message-content">
            {canOpen ? getPreview(message.message) : message.message}
          </span>
        </div>
        <div className="flex shrink-0 gap-2 items-center">
          {(isIncoming || isOutgoing) && message.qos !== undefined && (
            <span className="text-[10px] font-mono opacity-60">Q{message.qos}</span>
          )}
          {message.retain && (
            <span className="text-[10px] font-mono opacity-60">RET</span>
          )}
          {message.timestamp && (
            <span className="message-timestamp">{new Date(message.timestamp).toISOString()}</span>
          )}
          {canOpen ? (
            <span className="chevron-icon">
              {isOpen ? <IconChevronDown size={16} strokeWidth={1.5} /> : <IconChevronRight size={16} strokeWidth={1.5} />}
            </span>
          ) : <span className="w-4" />}
        </div>
      </div>
      {isOpen && parsedContent && (
        <div className="mt-2 h-[300px] w-full">
          <CodeEditor
            mode={parsedContent.type}
            theme={displayedTheme}
            enableLineWrapping
            font={preferences.codeFont || 'default'}
            value={parsedContent.content}
          />
        </div>
      )}
    </div>
  );
});

const MqttResponsePane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const response = item.response || {};
  const messages = Array.isArray(response.responses) ? response.responses : [];
  const [openMessages, setOpenMessages] = useState(new Set());
  const virtuosoRef = useRef(null);
  const [scrollerElement, setScrollerElement] = useState(null);
  const userScrolledAwayRef = useRef(false);

  const handleMessageToggle = useCallback((key) => {
    setOpenMessages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!scrollerElement) return;
    const handleWheel = (e) => {
      if (e.deltaY < 0) userScrolledAwayRef.current = true;
    };
    scrollerElement.addEventListener('wheel', handleWheel, { passive: true });
    return () => scrollerElement.removeEventListener('wheel', handleWheel);
  }, [scrollerElement]);

  const handleAtBottomStateChange = useCallback((atBottom) => {
    if (atBottom) userScrolledAwayRef.current = false;
  }, []);

  const followOutput = useCallback((isAtBottom) => {
    if (userScrolledAwayRef.current || openMessages.size > 0) return false;
    return isAtBottom ? 'smooth' : false;
  }, [openMessages.size]);

  const renderItem = useCallback((_, msg) => {
    const key = msg.seq ?? msg.timestamp;
    return <MqttMessageItem message={msg} isOpen={openMessages.has(key)} onToggle={handleMessageToggle} />;
  }, [openMessages, handleMessageToggle]);

  const computeItemKey = useCallback((_, msg) => msg.seq ?? msg.timestamp, []);

  if (!item.response && !messages.length) {
    return (
      <StyledWrapper className="flex h-full relative">
        <Placeholder />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="flex flex-col h-full relative">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase">Messages</span>
          {messages.length > 0 && (
            <span className="text-xs text-gray-500">({messages.length})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {response.statusText && (
            <span className={classnames('text-xs font-medium', {
              'text-green-600': response.statusText === 'CONNECTED',
              'text-red-500': response.statusText === 'ERROR' || response.statusText === 'DISCONNECTED',
              'text-yellow-500': response.statusText === 'CONNECTING'
            })}
            >
              {response.statusText}
            </span>
          )}
          {response.duration !== undefined && (
            <span className="text-xs text-gray-500">{(response.duration / 1000).toFixed(1)}s</span>
          )}
          <ResponseClear item={item} collection={collection} />
        </div>
      </div>
      <section className="flex flex-col flex-grow px-4 h-0">
        {messages.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">No messages yet. Connect to a broker and subscribe to topics.</div>
        ) : (
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
        )}
      </section>
    </StyledWrapper>
  );
};

export default MqttResponsePane;

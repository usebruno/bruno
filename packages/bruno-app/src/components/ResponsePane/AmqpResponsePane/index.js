import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import get from 'lodash/get';
import CodeEditor from 'components/CodeEditor/index';
import { useTheme } from 'providers/Theme';
import styled from 'styled-components';
import { clearAmqpMessages, clearAmqpActivity, setAmqpConnectionStatus } from 'providers/ReduxStore/slices/collections';
import ResponseHeaders from '../ResponseHeaders';

const DetailTabs = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;
  .tab {
    padding: 6px 0;
    border-bottom: solid 2px transparent;
    color: ${(props) => props.theme.colors.text.subtext0};
    cursor: pointer;
    font-size: 0.8125rem;
    user-select: none;
    &.active {
      color: ${(props) => props.theme.tabs.active.color};
      border-bottom: solid 2px ${(props) => props.theme.tabs.active.border};
      font-weight: ${(props) => props.theme.tabs.active.fontWeight};
    }
  }
`;

const formatMessageContent = (content) => {
  if (content == null) return { value: '', mode: 'text/plain' };
  if (typeof content === 'object') {
    try {
      return { value: JSON.stringify(content, null, 2), mode: 'application/ld+json' };
    } catch (_) {
      return { value: String(content), mode: 'text/plain' };
    }
  }
  const str = String(content);
  const trimmed = str.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return { value: JSON.stringify(JSON.parse(trimmed), null, 2), mode: 'application/ld+json' };
    } catch (_) {
      // not valid JSON, fall through to plain text
    }
  }
  return { value: str, mode: 'text/plain' };
};

const messageSnippet = (content) => {
  let str = typeof content === 'object' ? JSON.stringify(content) : String(content ?? '');
  str = str.replace(/\s+/g, ' ').trim();
  return str.length > 80 ? `${str.slice(0, 80)}\u2026` : str;
};

const buildMessageHeaders = (msg) => {
  const headers = {};
  if (!msg) return headers;
  const add = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    headers[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
  };
  if (msg.direction === 'in') {
    const fields = msg.fields || {};
    const props = msg.properties || {};
    add('Queue', msg.queue);
    add('Exchange', fields.exchange || '(default)');
    add('Routing Key', fields.routingKey);
    add('Delivery Tag', fields.deliveryTag);
    add('Redelivered', fields.redelivered);
    add('Consumer Tag', fields.consumerTag);
    add('Content-Type', props.contentType);
    add('Content-Encoding', props.contentEncoding);
    add('Correlation Id', props.correlationId);
    add('Reply To', props.replyTo);
    add('Message Id', props.messageId);
    add('Type', props.type);
    add('App Id', props.appId);
    add('Timestamp', props.timestamp);
    if (props.headers && typeof props.headers === 'object') {
      Object.entries(props.headers).forEach(([k, v]) => add(k, v));
    }
  } else {
    const opts = msg.properties || {};
    add('Exchange', msg.exchange);
    add('Routing Key', msg.routingKey);
    add('Confirmed', msg.confirmed ? 'true' : 'false');
    add('Content-Type', opts.contentType);
    add('Persistent', opts.persistent);
    add('Correlation Id', opts.correlationId);
    add('Reply To', opts.replyTo);
    add('Message Id', opts.messageId);
    add('Type', opts.type);
    add('App Id', opts.appId);
    if (opts.headers && typeof opts.headers === 'object') {
      Object.entries(opts.headers).forEach(([k, v]) => add(k, v));
    }
  }
  if (msg.contentBytes != null) add('Content-Length', `${msg.contentBytes}`);
  return headers;
};

const AmqpResponsePane = ({ item, collection }) => {
  const dispatch = useDispatch();
  const [detailTab, setDetailTab] = useState('response');
  const [selectedId, setSelectedId] = useState(null);
  const [messageFilter, setMessageFilter] = useState('all');
  const autoSelectRef = useRef(-1);
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  // Message log + activity timeline now live on the item's response in Redux
  // (populated by useAmqpEventListeners), so they survive tab switches/remounts.
  const messages = item.response?.type === 'amqp' ? item.response.messages : [];
  const activity = item.response?.type === 'amqp' ? item.response.activity : [];

  const filteredMessages = useMemo(() => {
    if (messageFilter === 'in') return messages.filter((m) => m.direction === 'in');
    if (messageFilter === 'out') return messages.filter((m) => m.direction === 'out');
    return messages;
  }, [messages, messageFilter]);

  const selectedMessage = useMemo(() => messages.find((m) => m.id === selectedId) || null, [messages, selectedId]);
  const selectedFormatted = useMemo(() => formatMessageContent(selectedMessage?.content), [selectedMessage]);
  const selectedHeaders = useMemo(() => buildMessageHeaders(selectedMessage), [selectedMessage]);
  const selectedHeaderCount = Object.keys(selectedHeaders).length;

  // When a message is selected, scope the timeline to just that message's calls
  // (the publish that sent it, or the consume session that delivered it).
  const timelineEntries = useMemo(() => {
    if (!selectedMessage) return activity;
    const category = selectedMessage.direction === 'out' ? 'publish' : 'consume';
    return activity.filter((e) => e.category === category && e.group != null && e.group === selectedMessage.group);
  }, [activity, selectedMessage]);

  // Auto-select the newest received message so the preview acts like a live
  // response. Tracks the last seen incoming id so we only auto-select on arrival.
  useEffect(() => {
    let lastIn = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].direction === 'in') {
        lastIn = messages[i];
        break;
      }
    }
    if (lastIn && lastIn.id !== autoSelectRef.current) {
      autoSelectRef.current = lastIn.id;
      setSelectedId(lastIn.id);
    }
  }, [messages]);

  // Reflect any existing connection (e.g. established from the request pane)
  // into Redux so the connection flags persist with the rest of the response.
  useEffect(() => {
    let cancelled = false;
    const { ipcRenderer } = window;
    ipcRenderer
      .invoke('renderer:amqp:connection-status', { itemUid: item.uid, collectionUid: collection.uid })
      .then((res) => {
        if (!cancelled && res?.success) {
          dispatch(
            setAmqpConnectionStatus({
              itemUid: item.uid,
              collectionUid: collection.uid,
              connected: !!res.status?.connected,
              consuming: !!res.status?.consuming
            })
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item.uid, collection.uid, dispatch]);

  return (
    <div className="flex flex-col h-full px-4 py-2">
      <div className="flex items-center gap-2 mb-3">
        <button
          className="px-3 py-1 text-xs font-medium rounded border hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => {
            dispatch(clearAmqpMessages({ itemUid: item.uid, collectionUid: collection.uid }));
            setSelectedId(null);
            autoSelectRef.current = -1;
          }}
        >
          Clear
        </button>
        <div className="flex items-center gap-1 ml-auto">
          {[['all', 'All'], ['out', 'Published'], ['in', 'Consumed']].map(([value, label]) => (
            <button
              key={value}
              className={`px-2 py-1 text-xs font-medium rounded border hover:bg-gray-100 dark:hover:bg-gray-700 ${messageFilter === value ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
              onClick={() => setMessageFilter(value)}
            >
              {label}
            </button>
          ))}
          <span className="text-xs opacity-50 ml-1">{filteredMessages.length} message(s)</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="overflow-y-auto border rounded mb-2 max-h-40 text-xs font-mono shrink-0">
          {filteredMessages.length === 0 ? (
            <div className="text-center opacity-40 py-6">
              {messages.length === 0
                ? 'No messages yet. Use Send to publish, or start consuming.'
                : 'No messages match this filter.'}
            </div>
          ) : (
            filteredMessages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedId(msg.id)}
                className={`flex items-center gap-2 px-2 py-1 cursor-pointer border-b last:border-b-0 ${
                  selectedId === msg.id
                    ? 'bg-indigo-50 dark:bg-indigo-900/30'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <span className={`text-[10px] font-bold shrink-0 ${msg.direction === 'in' ? 'text-green-600' : 'text-blue-600'}`}>
                  {msg.direction === 'in' ? '← RECV' : '→ SENT'}
                </span>
                {msg.direction === 'in' && msg.deliveryTag != null && (
                  <span className="text-[10px] font-medium opacity-70 shrink-0" title="Delivery tag">#{msg.deliveryTag}</span>
                )}
                {msg.direction === 'out' && msg.confirmed && (
                  <span className="text-[10px] font-medium text-green-600 shrink-0" title="Acknowledged by broker">✓</span>
                )}
                <span className="text-[10px] opacity-70 truncate flex-1 min-w-0">{messageSnippet(msg.content)}</span>
                {msg.routingKey && (
                  <span className="text-[10px] opacity-50 truncate shrink-0 max-w-[20%]" title={`Routing key: ${msg.routingKey}`}>key={msg.routingKey}</span>
                )}
                {msg.queue && (
                  <span className="text-[10px] opacity-50 truncate shrink-0 max-w-[20%]" title={`Queue: ${msg.queue}`}>q={msg.queue}</span>
                )}
                <span className="text-[10px] opacity-40 shrink-0">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0 border rounded">
          <DetailTabs className="px-3 pt-1 border-b">
            <div className={`tab ${detailTab === 'response' ? 'active' : ''}`} onClick={() => setDetailTab('response')}>Response</div>
            <div className={`tab ${detailTab === 'headers' ? 'active' : ''}`} onClick={() => setDetailTab('headers')}>
              Headers{selectedHeaderCount > 0 ? <sup className="ml-0.5 font-medium">{selectedHeaderCount}</sup> : null}
            </div>
            <div className={`tab ${detailTab === 'timeline' ? 'active' : ''}`} onClick={() => setDetailTab('timeline')}>Timeline</div>
          </DetailTabs>

          <div className="flex-1 relative min-h-0">
            {detailTab === 'response' && (
              selectedMessage ? (
                <div className="absolute inset-0">
                  <CodeEditor
                    collection={collection}
                    theme={displayedTheme}
                    font={get(preferences, 'font.codeFont', 'default')}
                    fontSize={get(preferences, 'font.codeFontSize')}
                    value={selectedFormatted.value}
                    mode={selectedFormatted.mode}
                    readOnly
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-40 text-xs">
                  Select a message to view its body
                </div>
              )
            )}

            {detailTab === 'headers' && (
              selectedMessage ? (
                <div className="absolute inset-0 overflow-y-auto">
                  <ResponseHeaders headers={selectedHeaders} item={item} />
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-40 text-xs">
                  Select a message to view its headers
                </div>
              )
            )}

            {detailTab === 'timeline' && (
              <div className="absolute inset-0 overflow-y-auto p-2 text-[11px] font-mono">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide opacity-60">
                    {selectedMessage
                      ? `Calls for selected ${selectedMessage.direction === 'out' ? 'published' : 'consumed'} message`
                      : 'All calls'}
                  </span>
                  <button
                    className="hover:underline text-[10px]"
                    onClick={() => dispatch(clearAmqpActivity({ itemUid: item.uid, collectionUid: collection.uid }))}
                  >
                    clear
                  </button>
                </div>
                {timelineEntries.length === 0 && (
                  <div className="opacity-40">{selectedMessage ? 'No calls related to this message.' : 'No calls yet.'}</div>
                )}
                {timelineEntries.map((entry, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="opacity-40 shrink-0">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span
                      className={
                        entry.level === 'error'
                          ? 'text-red-600'
                          : entry.level === 'success'
                            ? 'text-green-600'
                            : entry.level === 'debug'
                              ? 'opacity-70'
                              : 'opacity-80'
                      }
                    >
                      {entry.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmqpResponsePane;

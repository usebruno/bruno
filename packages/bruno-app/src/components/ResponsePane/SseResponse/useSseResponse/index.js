import { useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import useLocalStorage from 'hooks/useLocalStorage';
import { appSetRuntimeVariable } from 'providers/ReduxStore/slices/collections';
import { createSseMerger, DEFAULT_SSE_OPTIONS, getSseStorageKey } from 'utils/response/sse';

const EMPTY_MESSAGES = [];

const useSseResponse = (item, collection) => {
  const dispatch = useDispatch();
  const storageKey = getSseStorageKey(item, collection);
  const [options, setOptions] = useLocalStorage(storageKey, DEFAULT_SSE_OPTIONS);
  const [view, setView] = useLocalStorage(`${storageKey}-view`, 'merged');
  const messages = Array.isArray(item.response?.data) ? item.response.data : EMPTY_MESSAGES;
  const running = !!item.response?.stream?.running;
  const cache = useRef(null);

  const result = useMemo(() => {
    if (!cache.current || cache.current.options !== options || cache.current.first !== messages[0]
      || cache.current.processed > messages.length) {
      cache.current = { options, first: messages[0], processed: 0, merger: createSseMerger(options) };
    }
    const current = cache.current;
    for (let index = current.processed; index < messages.length; index++) {
      const message = messages[index];
      if (message.type === 'incoming' && typeof message.message === 'string') current.merger.push(message.message);
    }
    current.processed = messages.length;
    return current.merger.result();
  }, [messages, options]);

  const updateOptions = (value) => {
    const nextOptions = typeof value === 'function' ? value(options) : value;
    setOptions(nextOptions);
    if (running || !nextOptions.saveVariables || nextOptions.mode !== 'custom') return;

    // Stream completion is handled by middleware; completed responses only write on explicit edits.
    const merger = createSseMerger(nextOptions);
    messages.forEach((message) => {
      if (message.type === 'incoming' && typeof message.message === 'string') merger.push(message.message);
    });
    const merged = merger.result();
    if (merged.errors.some(Boolean)) return;
    merged.fields.forEach((field) => {
      dispatch(appSetRuntimeVariable({ collectionUid: collection.uid, key: field.name, value: field.text }));
    });
  };

  return { options, updateOptions, view, setView, messages, running, result };
};

export default useSseResponse;

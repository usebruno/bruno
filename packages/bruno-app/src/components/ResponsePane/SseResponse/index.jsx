import React from 'react';
import WSMessagesList from '../WsResponsePane/WSMessagesList';
import MergedVariable from './MergedVariable';
import useSseResponse from './useSseResponse';
import useSseAutoScroll from './useSseAutoScroll';
import StyledWrapper from './StyledWrapper';

const SseResponse = ({ item, collection }) => {
  const { options, updateOptions, view, setView, messages, running, result } = useSseResponse(item, collection);
  const { scrollRef, onScroll } = useSseAutoScroll(result, view);

  const updateRule = (index, update) => {
    updateOptions((current) => ({
      ...current,
      rules: current.rules.map((rule, ruleIndex) => ruleIndex === index ? { ...rule, ...update } : rule)
    }));
  };

  return (
    <StyledWrapper data-testid="sse-response">
      <div className="sse-toolbar">
        <div role="tablist" aria-label="SSE response view" className="view-tabs">
          <button type="button" data-testid="sse-view-merged" role="tab" aria-selected={view === 'merged'} onClick={() => setView('merged')}>Merged</button>
          <button type="button" data-testid="sse-view-events" role="tab" aria-selected={view === 'events'} onClick={() => setView('events')}>Events</button>
        </div>
        <span className="muted" title={`${result.matchedEventCount} events contain extracted values`}>{result.eventCount} events{running ? ' · Streaming' : ''}</span>
        <label className="mode-selector">
          Extract
          <select data-testid="sse-extraction-mode" aria-label="SSE extraction mode" value={options.mode} onChange={(e) => updateOptions({ ...options, mode: e.target.value })}>
            <option value="auto">Auto detect</option>
            <option value="custom">JSONPath</option>
            <option value="text">Text events</option>
          </select>
        </label>
      </div>

      {options.mode === 'custom' && (
        <details className="sse-rules" open>
          <summary>Extraction rules</summary>
          <p className="muted">Extract from each event’s JSON data. Append joins fragments; Latest keeps the most recent value.</p>
          {options.rules.map((rule, index) => (
            <div className="rule" key={index}>
              <div className="rule-inputs">
                <input
                  data-testid={`sse-rule-name-${index + 1}`}
                  aria-label={`Variable name ${index + 1}`}
                  placeholder="Variable name"
                  value={rule.name}
                  spellCheck={false}
                  onChange={(e) => updateRule(index, { name: e.target.value })}
                />
                <input
                  data-testid={`sse-rule-path-${index + 1}`}
                  className="jsonpath"
                  aria-label={`JSONPath ${index + 1}`}
                  placeholder="$.choices[0].delta.content"
                  value={rule.path}
                  spellCheck={false}
                  aria-invalid={!!result.errors[index]}
                  onChange={(e) => updateRule(index, { path: e.target.value })}
                />
                <select data-testid={`sse-rule-merge-${index + 1}`} aria-label={`Merge mode ${index + 1}`} value={rule.merge} onChange={(e) => updateRule(index, { merge: e.target.value })}>
                  <option value="append">Append</option>
                  <option value="latest">Latest</option>
                </select>
                <button
                  type="button"
                  data-testid={`sse-remove-rule-${index + 1}`}
                  aria-label={`Remove rule ${index + 1}`}
                  onClick={() => updateOptions({ ...options, rules: options.rules.filter((_, ruleIndex) => ruleIndex !== index) })}
                >×
                </button>
              </div>
              {result.errors[index] && <div role="alert" className="rule-error">{result.errors[index]}</div>}
            </div>
          ))}
          <div className="rule-actions">
            <button type="button" data-testid="sse-add-rule" onClick={() => updateOptions({ ...options, rules: [...options.rules, { name: '', path: '$.', merge: 'append' }] })}>Add variable</button>
            <label>
              <input
                type="checkbox"
                data-testid="sse-save-variables"
                checked={options.saveVariables}
                onChange={(e) => updateOptions({ ...options, saveVariables: e.target.checked })}
              />
              Save as runtime variables when the stream ends
            </label>
          </div>
        </details>
      )}

      {view === 'events' ? (
        <div className="sse-events"><WSMessagesList messages={messages} item={item} collection={collection} /></div>
      ) : (
        <div
          className="sse-merged"
          ref={scrollRef}
          onScroll={onScroll}
        >
          {result.fields.length ? result.fields.map((field) => <MergedVariable key={field.name} field={field} />) : (
            <div className="empty-state">
              {!result.eventCount ? 'Waiting for SSE events…' : options.mode === 'custom'
                ? 'No matching content. Check your JSONPath rules against the event data.'
                : 'No matching content. Choose JSONPath to extract fields from your events.'}
            </div>
          )}
        </div>
      )}
    </StyledWrapper>
  );
};

export default SseResponse;

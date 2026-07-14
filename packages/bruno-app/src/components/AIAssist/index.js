import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import get from 'lodash/get';
import Tippy from '@tippyjs/react';
import { IconX, IconArrowBackUp, IconPlayerStop } from '@tabler/icons';
import IconSparkles from 'components/Icons/IconSparkles';
import Button from 'ui/Button';
import { aiGenerateScript, stopAiGeneration } from 'utils/ai';
import StyledWrapper, { PopupWrapper } from './StyledWrapper';

const SUGGESTIONS = {
  'tests': [
    { label: 'Status 200', prompt: 'Add a test asserting the response status code is 200' },
    { label: 'JSON body', prompt: 'Add tests validating the JSON response body structure and key fields' },
    { label: 'Headers', prompt: 'Add a test checking the content-type response header' },
    { label: 'Response time', prompt: 'Add a test asserting the response time is below 1000ms' }
  ],
  'pre-request': [
    { label: 'Auth header', prompt: 'Set an Authorization header from an environment token variable' },
    { label: 'Timestamp', prompt: 'Set a variable named "timestamp" containing the current epoch ms' },
    { label: 'Random ID', prompt: 'Set a variable named "requestId" containing a random UUID-style id' }
  ],
  'post-response': [
    { label: 'Save token', prompt: 'Extract a token from the response body and save it to an environment variable' },
    { label: 'Save id', prompt: 'Extract the primary id from the response body and save it to a variable' },
    { label: 'Log response', prompt: 'Log the response status and a short summary of the body' }
  ],
  'docs': [
    { label: 'Overview', prompt: 'Write an overview section describing the purpose and key features' },
    { label: 'Request', prompt: 'Document the request method, URL, headers, parameters, and body' },
    { label: 'Examples', prompt: 'Add request and response examples with sample JSON' },
    { label: 'Errors', prompt: 'Document common error responses and status codes' }
  ],
  'app-request': [
    { label: 'Send button', prompt: 'Add a button that calls bru.ctx.submitRequest() and displays the response status, headers, and pretty-printed body' },
    { label: 'Form for body', prompt: 'Build a form whose fields override the request body, then send it with bru.ctx.submitRequest({ runtimeVariables }) and show the result' },
    { label: 'Response viewer', prompt: 'Render bru.ctx.http.response with collapsible JSON and a banner showing status and response time; update on bru.ctx.http.onResponseChange' },
    { label: 'Test results', prompt: 'List bru.ctx.tests and bru.ctx.assertions with pass/fail badges; refresh on bru.ctx.onTestsChange and bru.ctx.onAssertionsChange' }
  ],
  'app-collection': [
    { label: 'Request list', prompt: 'List all requests from bru.ctx.listRequests() with their method and url, and a Run button next to each that calls bru.ctx.runRequest(pathname)' },
    { label: 'Dashboard', prompt: 'Build a small dashboard that runs every request from bru.ctx.listRequests() on load and shows status code, response time, and a pass/fail dot for each' },
    { label: 'Form runner', prompt: 'Render a form, and on submit call bru.ctx.runRequest(pathname, { runtimeVariables }) for a chosen request and display the response' },
    { label: 'Variables panel', prompt: 'Show bru.ctx.variables.resolved in a table and allow editing values via bru.ctx.variables.runtime.set(name, value); react to bru.ctx.onVariablesChange' }
  ]
};

const TITLES = {
  'tests': 'Generate Tests',
  'pre-request': 'Generate Pre-Request Script',
  'post-response': 'Generate Post-Response Script',
  'docs': 'Generate Documentation',
  'app-request': 'Generate App',
  'app-collection': 'Generate App'
};

const PREVIEW_LABELS = {
  'docs': 'Preview · replaces current documentation',
  'app-request': 'Preview · replaces current app',
  'app-collection': 'Preview · replaces current app'
};

const isValidType = (t) => SUGGESTIONS[t] !== undefined;

const AIAssist = ({ scriptType, currentScript, requestContext, docsContext, variables, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(null);
  const streamIdRef = useRef(null);
  const tippyRef = useRef(null);

  // Focus the prompt textarea when coming back from preview
  useEffect(() => {
    if (isOpen && generated == null) {
      tippyRef.current?.popper?.querySelector('.popup-input')?.focus();
    }
  }, [isOpen, generated]);

  // handle Escape key to close the popup
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        tippyRef.current?.hide();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [isOpen]);

  const preferences = useSelector((state) => state.app.preferences);
  const isAiEnabled = get(preferences, 'ai.enabled', false);

  const suggestions = useMemo(() => SUGGESTIONS[scriptType] || [], [scriptType]);
  const title = TITLES[scriptType] || 'Generate with AI';
  const previewLabel = PREVIEW_LABELS[scriptType] || 'Preview · replaces current script';

  const close = useCallback(() => {
    tippyRef.current?.hide();
  }, []);

  const handleGenerate = useCallback(
    async (overridePrompt) => {
      const text = (overridePrompt ?? prompt).trim();
      if (!text || isLoading) return;
      setIsLoading(true);
      setError(null);

      const streamId = `sparkle-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      streamIdRef.current = streamId;

      try {
        const result = await aiGenerateScript({
          scriptType,
          prompt: text,
          currentScript: currentScript || '',
          requestContext,
          docsContext,
          variables,
          streamId
        });
        if (result?.stopped) {
          return;
        }
        if (result?.error) {
          setError(result.error);
          return;
        }
        if (result?.content) {
          setGenerated(result.content);
        } else {
          setError('No content was generated. Try rephrasing your prompt.');
        }
      } catch (err) {
        setError(err?.message || 'Failed to generate script');
      } finally {
        streamIdRef.current = null;
        setIsLoading(false);
      }
    },
    [prompt, isLoading, scriptType, currentScript, requestContext, docsContext, variables]
  );

  const handleStop = useCallback(() => {
    if (streamIdRef.current) {
      stopAiGeneration(streamIdRef.current);
    }
  }, []);

  const handleApply = useCallback(() => {
    if (generated == null) return;
    onApply(generated);
    setGenerated(null);
    setPrompt('');
    close();
  }, [generated, onApply, close]);

  const handleBackToPrompt = useCallback(() => {
    setGenerated(null);
    setError(null);
  }, []);

  if (!isAiEnabled || !isValidType(scriptType)) return null;

  return (
    <StyledWrapper>
      <Tippy
        interactive
        trigger="click"
        placement="bottom-end"
        arrow={false}
        animation={false}
        maxWidth="none"
        appendTo={() => document.body}
        onCreate={(instance) => (tippyRef.current = instance)}
        onShow={(instance) => {
          setIsOpen(true);
          // rAF so the popup content is in the DOM
          requestAnimationFrame(() => instance.popper?.querySelector('.popup-input')?.focus());
        }}
        onHide={() => {
          setIsOpen(false);
          setError(null);
        }}
        render={(attrs) => (
          <PopupWrapper className="ai-assist-popup" role="dialog" aria-label={title} tabIndex={-1} {...attrs}>
            <div className="popup-header">
              <span className="popup-title">
                <IconSparkles size={12} strokeWidth={1.75} />
                {title}
              </span>
              <button className="popup-close" onClick={close} type="button" aria-label="Close">
                <IconX size={14} />
              </button>
            </div>

            {generated == null ? (
              <>
                <div className="popup-body">
                  <textarea
                    className="popup-input"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                      }
                    }}
                    placeholder="Describe what you want to generate..."
                    rows={3}
                    disabled={isLoading}
                  />

                  {!isLoading && !prompt && suggestions.length > 0 && (
                    <div className="popup-suggestions">
                      {suggestions.map((s) => (
                        <button
                          key={s.label}
                          className="suggestion-chip"
                          type="button"
                          onClick={() => handleGenerate(s.prompt)}
                          disabled={isLoading}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {error && <div className="popup-error">{error}</div>}
                </div>

                <div className="popup-footer">
                  {isLoading ? (
                    <span className="popup-loading">
                      <span className="loading-spinner" />
                      Generating...
                    </span>
                  ) : (
                    <span className="popup-hint">Enter to generate · Shift+Enter for newline</span>
                  )}
                  {isLoading ? (
                    <Button
                      variant="filled"
                      color="danger"
                      size="sm"
                      rounded="sm"
                      icon={<IconPlayerStop size={12} />}
                      onClick={handleStop}
                      title="Stop generating"
                    >
                      Stop
                    </Button>
                  ) : (
                    <button
                      className="btn-generate"
                      type="button"
                      onClick={() => handleGenerate()}
                      disabled={!prompt.trim()}
                    >
                      Generate
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="popup-body">
                  <div className="preview-section">
                    <span className="preview-label">{previewLabel}</span>
                    <div className="preview-code">
                      <pre>{generated}</pre>
                    </div>
                  </div>
                </div>

                <div className="popup-footer">
                  <button className="btn-secondary" type="button" onClick={handleBackToPrompt}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <IconArrowBackUp size={12} /> Back
                    </span>
                  </button>
                  <button className="btn-generate" type="button" onClick={handleApply}>
                    Apply
                  </button>
                </div>
              </>
            )}
          </PopupWrapper>
        )}
      >
        <button
          className={`ai-assist-trigger ${isOpen ? 'open' : ''}`}
          title={title}
          type="button"
          aria-label={title}
        >
          <IconSparkles size={14} strokeWidth={1.75} />
        </button>
      </Tippy>
    </StyledWrapper>
  );
};

export default AIAssist;

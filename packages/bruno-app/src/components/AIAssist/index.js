import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import get from 'lodash/get';
import { IconStars, IconX, IconArrowBackUp } from '@tabler/icons';
import { aiGenerateScript } from 'utils/ai';
import StyledWrapper from './StyledWrapper';

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
  ]
};

const TITLES = {
  'tests': 'Generate Tests',
  'pre-request': 'Generate Pre-Request Script',
  'post-response': 'Generate Post-Response Script'
};

const isValidType = (t) => SUGGESTIONS[t] !== undefined;

const AIAssist = ({ scriptType, currentScript, requestContext, onApply }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generated, setGenerated] = useState(null);
  const buttonRef = useRef(null);

  const focusOnMount = useCallback((el) => {
    el?.focus();
  }, []);

  const preferences = useSelector((state) => state.app.preferences);
  const isAiEnabled = get(preferences, 'ai.enabled', false);

  const suggestions = useMemo(() => SUGGESTIONS[scriptType] || [], [scriptType]);
  const title = TITLES[scriptType] || 'Generate with AI';

  const close = useCallback(() => {
    setIsOpen(false);
    setError(null);
  }, []);

  const attachPopup = useCallback((el) => {
    if (!el) return undefined;
    const onDocMouseDown = (e) => {
      if (!el.contains(e.target) && !buttonRef.current?.contains(e.target)) {
        close();
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [close]);

  const handleGenerate = useCallback(
    async (overridePrompt) => {
      const text = (overridePrompt ?? prompt).trim();
      if (!text || isLoading) return;
      setIsLoading(true);
      setError(null);

      try {
        const result = await aiGenerateScript({
          scriptType,
          prompt: text,
          currentScript: currentScript || '',
          requestContext
        });
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
        setIsLoading(false);
      }
    },
    [prompt, isLoading, scriptType, currentScript, requestContext]
  );

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
      <button
        ref={buttonRef}
        className={`ai-assist-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
        title={title}
        type="button"
        aria-label={title}
      >
        <IconStars size={14} strokeWidth={1.75} />
      </button>

      {isOpen && (
        <div ref={attachPopup} className="ai-assist-popup" role="dialog" aria-label={title}>
          <div className="popup-header">
            <span className="popup-title">
              <IconStars size={12} strokeWidth={1.75} />
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
                  ref={focusOnMount}
                  className="popup-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
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
                  <span className="popup-hint">⌘ + Enter to generate</span>
                )}
                <button
                  className="btn-generate"
                  type="button"
                  onClick={() => handleGenerate()}
                  disabled={!prompt.trim() || isLoading}
                >
                  Generate
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="popup-body">
                <div className="preview-section">
                  <span className="preview-label">Preview · replaces current script</span>
                  <pre className="preview-code">{generated}</pre>
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
        </div>
      )}
    </StyledWrapper>
  );
};

export default AIAssist;

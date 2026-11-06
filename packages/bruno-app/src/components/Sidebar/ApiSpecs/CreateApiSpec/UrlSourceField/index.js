import React from 'react';

const UrlSourceField = ({ url, validationError, onChange, onBlur, isFetching, error, onUrlChanged, onResolveUrl }) => (
  <>
    <input
      id="spec-url"
      type="text"
      name="specUrl"
      className="mt-3 block textbox w-full"
      placeholder="https://api.example.com/openapi.json"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      value={url}
      onChange={(e) => {
        onUrlChanged(e.target.value);
        onChange(e);
      }}
      onBlur={(e) => {
        onBlur(e);
        if (e.target.value.trim()) {
          onResolveUrl(e.target.value);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          onResolveUrl(e.target.value);
        }
      }}
      data-testid="api-spec-url"
    />
    {isFetching ? (
      <div className="text-xs mt-1 opacity-70" data-testid="api-spec-url-loading">
        Fetching specification…
      </div>
    ) : null}
    {error ? (
      <div className="text-red-500 break-words" data-testid="api-spec-url-error">{error}</div>
    ) : null}
    {!isFetching && !error && validationError ? (
      <div className="text-red-500 break-words">{validationError}</div>
    ) : null}
  </>
);

export default UrlSourceField;

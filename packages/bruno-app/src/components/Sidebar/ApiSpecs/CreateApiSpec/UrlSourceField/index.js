import React from 'react';

const UrlSourceField = ({ formik, isFetching, error, onUrlChanged, onResolveUrl }) => (
  <>
    <input
      id="spec-url"
      type="text"
      name="specUrl"
      className="mt-8 block textbox w-full"
      placeholder="https://api.example.com/openapi.json"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      value={formik.values.specUrl || ''}
      onChange={(e) => {
        onUrlChanged(e.target.value);
        formik.handleChange(e);
      }}
      onBlur={(e) => {
        formik.handleBlur(e);
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
    {!isFetching && !error && formik.touched.specUrl && formik.errors.specUrl ? (
      <div className="text-red-500 break-words">{formik.errors.specUrl}</div>
    ) : null}
  </>
);

export default UrlSourceField;

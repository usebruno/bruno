import React from 'react';
import { IconLink } from '@tabler/icons';

const UrlSourceField = ({ formik, isFetching, error, onUrlChanged, onResolveUrl }) => (
  <>
    <label htmlFor="spec-url" className="block font-semibold mt-3">
      Spec URL
    </label>
    <div className="relative mt-2">
      {formik.values.specUrl ? (
        <span className="input-icon">
          <IconLink size={14} strokeWidth={1.5} />
        </span>
      ) : null}
      <input
        id="spec-url"
        type="text"
        name="specUrl"
        className={`block textbox w-full ${formik.values.specUrl ? '!pl-9' : ''}`}
        placeholder="https://example.com/openapi.yaml"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        value={formik.values.specUrl || ''}
        onChange={(e) => {
          onUrlChanged();
          formik.handleChange(e);
        }}
        onBlur={(e) => {
          formik.handleBlur(e);
          if (e.target.value.trim()) {
            onResolveUrl(e.target.value);
          }
        }}

        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();

            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            onResolveUrl(e.target.value);
          }
        }}
        data-testid="api-spec-url"
      />
    </div>
    {isFetching ? (
      <div className="text-xs mt-1 opacity-70" data-testid="api-spec-url-loading">
        Fetching specification…
      </div>
    ) : null}
    {error ? (
      <div className="text-red-500" data-testid="api-spec-url-error">{error}</div>
    ) : null}
    {!isFetching && !error && formik.touched.specUrl && formik.errors.specUrl ? (
      <div className="text-red-500">{formik.errors.specUrl}</div>
    ) : null}
  </>
);

export default UrlSourceField;

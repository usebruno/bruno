import React from 'react';

const SpecLocationField = ({ location, error, onBrowse }) => (
  <>
    <label htmlFor="api-spec-location" className="block font-semibold mt-5">
      Location
    </label>
    <input
      id="api-spec-location"
      type="text"
      name="apiSpecLocation"
      readOnly={true}
      className="block textbox mt-1 w-full cursor-pointer"
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      title={location}
      value={location}
      onClick={onBrowse}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onBrowse();
        }
      }}
    />
    {error ? (
      <div className="text-red-500 break-words">{error}</div>
    ) : null}
    <div className="mt-1">
      <span className="text-link cursor-pointer hover:underline" onClick={onBrowse}>
        Browse
      </span>
    </div>
  </>
);

export default SpecLocationField;

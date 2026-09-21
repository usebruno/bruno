import React from 'react';
import { IconChevronDown, IconChevronUp, IconFolder } from '@tabler/icons';

const AdvancedSettings = ({ formik, isOpen, onToggle, onBrowse }) => (
  <>
    <button
      type="button"
      className="advanced-settings-toggle flex items-center mt-4"
      aria-expanded={isOpen}
      aria-controls="api-spec-advanced-settings"
      onClick={onToggle}
      data-testid="api-spec-advanced-settings-toggle"
    >
      Advanced settings
      {isOpen ? (
        <IconChevronUp className="ml-1" size={16} strokeWidth={2} />
      ) : (
        <IconChevronDown className="ml-1" size={16} strokeWidth={2} />
      )}
    </button>
    {isOpen ? (
      <div id="api-spec-advanced-settings">
        <label htmlFor="api-spec-location" className="block font-semibold mt-3">
          Spec Location
        </label>
        <div className="relative mt-2">
          {formik.values.apiSpecLocation ? (
            <span className="input-icon">
              <IconFolder size={14} strokeWidth={1.5} />
            </span>
          ) : null}
          <input
            id="api-spec-location"
            type="text"
            name="apiSpecLocation"
            readOnly={true}
            className={`block textbox w-full cursor-pointer ${formik.values.apiSpecLocation ? '!pl-9' : ''}`}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            title={formik.values.apiSpecLocation || ''}
            value={formik.values.apiSpecLocation || ''}
            onClick={onBrowse}
          />
        </div>
        {formik.touched.apiSpecLocation && formik.errors.apiSpecLocation ? (
          <div className="text-red-500">{formik.errors.apiSpecLocation}</div>
        ) : null}
        <div className="mt-1">
          <span className="text-link cursor-pointer hover:underline" onClick={onBrowse}>
            Browse
          </span>
        </div>
      </div>
    ) : null}
  </>
);

export default AdvancedSettings;

import React from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

const SettingsField = ({ label, htmlFor, hint, error, disabled = false, children, className = '' }) => {
  return (
    <StyledWrapper className={classnames('settings-field', className, { 'is-disabled': disabled })}>
      {label ? (
        <label className="settings-field-label select-none" htmlFor={htmlFor}>
          {label}
        </label>
      ) : null}
      {hint ? <p className="settings-field-hint">{hint}</p> : null}
      <div className="settings-field-control">{children}</div>
      {error ? <div className="settings-field-error">{error}</div> : null}
    </StyledWrapper>
  );
};

export default SettingsField;

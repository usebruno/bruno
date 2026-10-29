import React from 'react';
import StyledWrapper from './StyledWrapper';

const SettingsGroup = ({ title, description, children, className = '' }) => {
  return (
    <StyledWrapper className={`settings-group ${className}`}>
      {title ? <h3 className="settings-group-title select-none">{title}</h3> : null}
      {description ? <p className="settings-group-description">{description}</p> : null}
      <div className="settings-group-body">{children}</div>
    </StyledWrapper>
  );
};

export default SettingsGroup;

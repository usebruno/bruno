import React from 'react';
import StyledWrapper from './StyledWrapper';

const SettingsHeader = ({ title, description, className }) => {
  return (
    <StyledWrapper className={className}>
      <h1 className="settings-header-title">{title}</h1>
      {description && <p className="settings-header-description">{description}</p>}
    </StyledWrapper>
  );
};

export default SettingsHeader;

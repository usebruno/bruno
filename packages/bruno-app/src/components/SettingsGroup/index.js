import React from 'react';
import StyledWrapper from './StyledWrapper';

/**
 * SettingsGroup - a titled block of related settings, separated from the previous group by a divider.
 *
 * @param {ReactNode} props.title - Group title
 * @param {ReactNode} props.description - Optional text under the title
 * @param {string} props.gap - Space between the group's items (default: 0.5rem)
 */
const SettingsGroup = ({ title, description, gap = '0.5rem', children, className = '' }) => {
  return (
    <StyledWrapper className={`settings-group ${className}`} $gap={gap}>
      {title ? <h3 className="settings-group-title select-none">{title}</h3> : null}
      {description ? <p className="settings-group-description">{description}</p> : null}
      <div className="settings-group-body">{children}</div>
    </StyledWrapper>
  );
};

export default SettingsGroup;

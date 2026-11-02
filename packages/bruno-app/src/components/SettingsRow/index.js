import React from 'react';
import StyledWrapper from './StyledWrapper';

/**
 * A settings row with a label and description on the left and a right-aligned control.
 *
 * Controls align along the right edge, while the text fills the remaining space.
 *
 * @param {string} props.label - Setting name
 * @param {string} props.description - Optional description below the label
 * @param {string} props.htmlFor - ID of the associated control
 * @param {ReactNode} props.children - Control to render (toggle, input, dropdown)
 */
const SettingsRow = ({ label, description, htmlFor, children }) => {
  return (
    <StyledWrapper className="settings-row">
      <div className="settings-row-text">
        <label className="settings-row-label" htmlFor={htmlFor}>
          {label}
        </label>
        {description && <p className="settings-row-description">{description}</p>}
      </div>
      <div className="settings-row-control">{children}</div>
    </StyledWrapper>
  );
};

export default SettingsRow;

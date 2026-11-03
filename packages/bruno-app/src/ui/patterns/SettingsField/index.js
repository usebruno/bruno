import React from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

/**
 * SettingsField renders a label, optional description, control, and error.
 *
 * Layouts:
 * - stacked (default): Text above the control. For full-width inputs and pickers.
 * - inline: Text on the left, control on the right. For toggles and compact inputs.
 *   Uses a fixed control column (`controlWidth`, default 8rem) to keep rows aligned.
 * - leading: Control on the left, text on the right. For checkboxes and radios.
 *
 * Accessibility:
 * - Use `htmlFor` with a matching control ID to render a native <label>.
 * - Otherwise, use `labelId` with `aria-labelledby` to associate the label.
 * - Use `descriptionId` with `aria-describedby` to associate the description.
 *
 * @param {ReactNode} props.label - Setting label
 * @param {ReactNode} props.description - Optional description below the label
 * @param {ReactNode} props.error - Optional validation message
 * @param {'stacked'|'inline'|'leading'} props.layout - Layout (default: 'stacked')
 * @param {string} props.htmlFor - ID of the associated control
 * @param {string} props.labelId - Label ID for aria-labelledby
 * @param {string} props.descriptionId - Description ID for aria-describedby
 * @param {string} props.controlWidth - Inline control width (default: '8rem')
 * @param {ReactNode} props.children - Setting control
 */
const SettingsField = ({
  label,
  description,
  error,
  layout = 'stacked',
  htmlFor,
  labelId,
  descriptionId,
  controlWidth = '8rem',
  className,
  children,
  'data-testid': dataTestId
}) => {
  const LabelTag = htmlFor ? 'label' : 'span';

  return (
    <StyledWrapper
      className={classnames('settings-field', `settings-field--${layout}`, className)}
      $controlWidth={controlWidth}
      data-testid={dataTestId}
    >
      {(label || description) && (
        <div className="settings-field-text">
          {label && (
            <LabelTag id={labelId} className="settings-field-label" htmlFor={htmlFor}>
              {label}
            </LabelTag>
          )}
          {description && (
            <p id={descriptionId} className="settings-field-description">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="settings-field-control">{children}</div>
      {error && (
        <div className="settings-field-error" role="alert">
          {error}
        </div>
      )}
    </StyledWrapper>
  );
};

export default SettingsField;

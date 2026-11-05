import React from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

/**
 * FormField renders a label, optional description, control, and error.
 *
 * Presentational only: no state, no context, no generated IDs. The caller owns the control and
 * its wiring. Not the same as ui/InputWrapper, which is the internal wrapper of TextInput, Select
 * and MaskedInput; use FormField when a screen composes its own control.
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
 * @param {ReactNode} props.label - Field label
 * @param {ReactNode} props.description - Optional description below the label
 * @param {ReactNode} props.error - Optional validation message
 * @param {'stacked'|'inline'|'leading'} props.layout - Layout (default: 'stacked')
 * @param {string} props.htmlFor - ID of the associated control
 * @param {string} props.labelId - Label ID for aria-labelledby
 * @param {string} props.descriptionId - Description ID for aria-describedby
 * @param {string} props.controlWidth - Inline control width (default: '8rem')
 * @param {ReactNode} props.children - The control
 */
const FormField = ({
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
      className={classnames('form-field', `form-field--${layout}`, className)}
      $controlWidth={controlWidth}
      data-testid={dataTestId}
    >
      {(label || description) && (
        <div className="form-field-text">
          {label && (
            <LabelTag id={labelId} className="form-field-label" htmlFor={htmlFor}>
              {label}
            </LabelTag>
          )}
          {description && (
            <p id={descriptionId} className="form-field-description">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="form-field-control">{children}</div>
      {error && (
        <div className="form-field-error" role="alert">
          {error}
        </div>
      )}
    </StyledWrapper>
  );
};

export default FormField;

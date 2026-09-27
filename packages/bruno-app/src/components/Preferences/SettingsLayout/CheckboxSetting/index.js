import React from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

const CheckboxSetting = ({
  id,
  name,
  label,
  description,
  checked,
  onChange,
  disabled = false,
  children,
  className = '',
  ...rest
}) => {
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <StyledWrapper className={classnames('setting-checkbox', className, { 'is-disabled': disabled })}>
      <div className="setting-checkbox-control">
        <input
          id={id}
          type="checkbox"
          name={name || id}
          checked={!!checked}
          onChange={onChange}
          disabled={disabled}
          aria-describedby={descriptionId}
          className="mousetrap"
          {...rest}
        />
        <label className="setting-checkbox-label select-none" htmlFor={id}>
          {label}
        </label>
      </div>
      {description ? (
        <p id={descriptionId} className="setting-checkbox-description">
          {description}
        </p>
      ) : null}
      {children ? <div className="setting-checkbox-children">{children}</div> : null}
    </StyledWrapper>
  );
};

export default CheckboxSetting;

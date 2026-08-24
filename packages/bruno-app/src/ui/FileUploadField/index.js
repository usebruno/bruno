import React, { useRef } from 'react';
import { IconAlertCircle, IconFile, IconUpload, IconX } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import ActionIcon from 'ui/ActionIcon';
import StyledWrapper from './StyledWrapper';

/**
 * Display-only basename, split on both separators so a Windows path still reads
 * correctly when viewed elsewhere.
 */
const basename = (filePath) => String(filePath).split(/[\\/]/).pop();

/**
 * FileUploadField — the control for "pick one file and remember where it is".
 */

const FileUploadField = ({
  id,
  name,
  value,
  onChange,
  accept,
  placeholder = 'Choose a file',
  disabled = false,
  invalid = false,
  clearLabel = 'Remove file',
  className = '',
  'data-testid': testId,
  ...rest
}) => {
  const inputRef = useRef();
  const { theme } = useTheme();
  const testIdBase = testId || id;

  const handleSelect = (event) => {
    const filePath = window?.ipcRenderer?.getFilePath?.(event.target.files?.[0]);
    if (filePath) {
      onChange?.(filePath);
    }
    // Reset the input so picking the same file again still fires a change.
    event.target.value = '';
  };

  const LeadingIcon = invalid ? IconAlertCircle : value ? IconFile : IconUpload;

  return (
    <StyledWrapper
      className={[
        'file-upload-field',
        disabled ? 'is-disabled' : '',
        invalid ? 'is-invalid' : '',
        value ? 'has-value' : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <input
        id={id}
        name={name || id}
        type="file"
        className="file-upload-input"
        accept={accept}
        disabled={disabled}
        tabIndex="-1"
        ref={inputRef}
        onChange={handleSelect}
        {...rest}
      />

      <button
        type="button"
        className="file-upload-trigger"
        disabled={disabled}
        title={value || undefined}
        onClick={() => inputRef.current?.click()}
        data-testid={testIdBase ? `${testIdBase}-trigger` : undefined}
      >
        <LeadingIcon className="file-upload-icon" size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="file-upload-name">{value ? basename(value) : placeholder}</span>
      </button>

      {value ? (
        <ActionIcon
          type="button"
          className="file-upload-clear"
          label={clearLabel}
          size="sm"
          disabled={disabled}
          colorOnHover={theme.colors.text.danger}
          onClick={() => onChange?.(null)}
          data-testid={testIdBase ? `${testIdBase}-clear` : undefined}
        >
          <IconX size={14} strokeWidth={1.5} />
        </ActionIcon>
      ) : null}
    </StyledWrapper>
  );
};

export default FileUploadField;

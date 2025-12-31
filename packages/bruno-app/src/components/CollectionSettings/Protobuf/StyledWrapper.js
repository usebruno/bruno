import styled from 'styled-components';

const StyledWrapper = styled.div`
  .available-certificates {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};

    button.remove-certificate {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }

  /* Section labels */
  label {
    color: ${(props) => props.theme.text};
  }

  /* Tooltip icon */
  .tooltip-icon {
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;
  }

  /* Error messages */
  .error-message {
    color: ${(props) => props.theme.colors.text.danger};
    background-color: ${(props) => props.theme.bg};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;

    thead {
      th {
        text-align: left;
        font-size: ${(props) => props.theme.font.size.xs};
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: ${(props) => props.theme.table.thead.color};
        border: 1px solid ${(props) => props.theme.table.border};
        padding: 0.5rem 0.75rem;

        &.text-right {
          text-align: right;
        }
      }
    }

    tbody {
      td {
        border: 1px solid ${(props) => props.theme.table.border};
        padding: 0.5rem 0.75rem;

        &.text-center {
          text-align: center;
        }

        &.text-right {
          text-align: right;
        }
      }
    }
  }

  /* File/Directory icons */
  .file-icon,
  .folder-icon {
    color: ${(props) => props.theme.colors.text.muted};
  }

  /* File/Directory names */
  .file-name,
  .directory-name {
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  /* Path text */
  .path-text {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    font-family: monospace;
  }

  /* Empty state */
  .empty-state {
    .empty-icon {
      color: ${(props) => props.theme.colors.text.muted};
    }

    .empty-text {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  /* Invalid file indicator */
  .invalid-indicator {
    color: ${(props) => props.theme.colors.text.danger};
  }

  /* Action buttons */
  .action-button {
    padding: 0.25rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    transition: all 0.2s;

    &.replace-button {
      color: ${(props) => props.theme.colors.text.danger};

      &:hover {
        color: ${(props) => props.theme.colors.text.danger};
        background-color: ${(props) => props.theme.colors.bg.danger}20;
      }
    }

    &.remove-button {
      color: ${(props) => props.theme.colors.text.muted};

      &:hover {
        color: ${(props) => props.theme.text};
        background-color: ${(props) => props.theme.dropdown.hoverBg};
      }
    }
  }

  /* Checkbox */
  input[type='checkbox'] {
    cursor: pointer;
    accent-color: ${(props) => props.theme.colors.accent};
    border-color: ${(props) => props.theme.table.border};

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.primary.solid};
    }
  }

  /* Add button */
  .btn-add-param {
    color: ${(props) => props.theme.textLink};
    padding-right: 0.5rem;
    padding-top: 0.75rem;
    padding-bottom: 0.75rem;
    margin-top: 0.5rem;
    user-select: none;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: ${(props) => props.theme.primary.solid};
    }
  }
`;

export default StyledWrapper;

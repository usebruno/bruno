import styled from 'styled-components';

const StyledWrapper = styled.div`
  label {
    color: ${(props) => props.theme.text};
  }

  .hint {
    color: ${(props) => props.theme.colors.text.muted};
  }

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

  .folder-icon {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .folder-name {
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .path-text {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    font-family: monospace;
  }

  .empty-state {
    .empty-icon {
      color: ${(props) => props.theme.colors.text.muted};
    }

    .empty-text {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .action-button {
    padding: 0.25rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    transition: all 0.2s;
    color: ${(props) => props.theme.colors.text.muted};

    &:hover {
      color: ${(props) => props.theme.text};
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }
  }
`;

export default StyledWrapper;

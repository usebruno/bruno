import styled from 'styled-components';

const StyledWrapper = styled.div`
  .export-content {
    padding: 0.5rem 0;
  }

  .environments-section {
    margin-bottom: 1rem;
  }

  .environments-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    max-height: 280px;
    overflow-y: auto;
  }

  .environment-column {
    border: #606060 1px solid;
    border-radius: 0.25rem;
    padding: 0.75rem;
    min-height: 160px;
  }

  .environment-group {
    margin-bottom: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 1rem;
    text-align: center;

    span {
      color: ${(props) => props.theme.textMuted};
    }
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
    padding-bottom: 0.25rem;

    h3 {
      margin: 0;
      color: ${(props) => props.theme.text};
    }

    button {
      background: none;
      color: ${(props) => props.theme.textLink};
      border: none;
      cursor: pointer;
      padding: 0.125rem 0.25rem;
      border-radius: 0.125rem;
    }
  }

  .environment-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    overflow-y: auto;
  }

  .environment-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.375rem 0.5rem;
    border-radius: 0.25rem;
    transition: background-color 0.15s ease;

    input[type="checkbox"] {
      margin: 0;
      width: 14px;
      height: 14px;
      flex-shrink: 0;
    }

    .environment-name {
      color: ${(props) => props.theme.text};
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }
  }

  /* Tooltip styles for word wrapping */
  [data-tooltip] {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
    max-width: 200px !important;
  }


  .location-input {
    margin-bottom: 1rem;

    label {
      color: ${(props) => props.theme.text};
      margin-bottom: 0.375rem;
      display: block;
    }

    .flex {
      display: flex;
      gap: 0.5rem;
      align-items: stretch;
    }

    .textbox {
      padding: 0.5rem 0.75rem;
      border-radius: 0.25rem;
      transition: border-color 0.15s ease;

      &:focus {
        outline: none;
      }

    }
  }

  .export-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
    padding-top: 0.75rem;

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 0.25rem;
      cursor: pointer;
      transition: all 0.15s ease;
      min-width: 80px;
      text-align: center;

      &:disabled {
        cursor: not-allowed;
      }
    }

    .btn-cancel {
      background-color: transparent;
      color: ${(props) => props.theme.text};

    }
  }
`;

export default StyledWrapper;

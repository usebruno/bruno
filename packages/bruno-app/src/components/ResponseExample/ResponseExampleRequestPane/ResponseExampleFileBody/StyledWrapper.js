import styled from 'styled-components';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 500;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: ${(props) => props.theme.font.size.base};
      user-select: none;
    }
    td {
      padding: 6px 10px;
      }
    }

  .btn-add-param {
    font-size: ${(props) => props.theme.font.size.base};
  }

  input[type='text'] {
    width: 100%;
    border: solid 1px transparent;
    outline: none !important;
    color: ${(props) => props.theme.table.input.color};
    background: transparent;

    &:focus {
      outline: none !important;
      border: solid 1px transparent;
    }
  }

  input[type='checkbox'] {
    cursor: pointer;
    position: relative;
    top: 1px;
  }

  .btn-action {
    background: none;
    border: none;
    cursor: pointer;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    
    &:hover {
      opacity: 0.8;
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .file-value-cell {
    .file-icon {
      color: ${(props) => props.theme.colors.text.muted};
    }

    .file-name {
      color: ${(props) => props.theme.text};
    }

    .clear-file-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px;
      color: ${(props) => props.theme.colors.text.muted};
      display: flex;
      align-items: center;

      &:hover {
        color: ${(props) => props.theme.colors.text.danger};
      }
    }
  }

  .upload-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: ${(props) => props.theme.colors.text.muted};
    display: flex;
    align-items: center;

    &:hover {
      color: ${(props) => props.theme.primary.solid};
    }
  }

  .placeholder-text {
    color: ${(props) => props.theme.colors.text.muted};
    font-style: italic;
  }

  tr {
    position: relative;
    
    &:hover .delete-button.edit-mode {
      opacity: 1;
      visibility: visible;
    }
  }

  .delete-button {
    opacity: 0;
    visibility: hidden;
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    color: ${(props) => props.theme.colors.text.muted};
    margin-left: 8px;
    
    &:hover {
      color: ${(props) => props.theme.colors.text.red};
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    svg {
      width: 16px;
      height: 16px;
      color: ${(props) => props.theme.text};
    }
  }
`;

export default Wrapper;

import styled from 'styled-components';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 600;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: 0.8125rem;
      user-select: none;
    }
    td {
      padding: 6px 10px;
      }
    }

  .btn-add-param {
    font-size: 0.8125rem;
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

  .btn-secondary {
    &.edit-mode {
      background-color: ${(props) => props.theme.colors.text.yellow}20;
      border-color: ${(props) => props.theme.colors.text.yellow};
      color: ${(props) => props.theme.colors.text.yellow};
    }

    &.view-mode {
      background-color: transparent;
      border-color: ${(props) => props.theme.colors.text.muted};
      color: ${(props) => props.theme.colors.text.muted};
      cursor: default;
    }
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

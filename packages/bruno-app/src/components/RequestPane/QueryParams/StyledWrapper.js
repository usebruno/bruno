import styled from 'styled-components';

const Wrapper = styled.div`
  div.title {
    color: ${(props) => props.theme.colors?.text?.subtext0 || props.theme.table.thead.color};
  }
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

  td {
    &:nth-child(1) {
      padding: 0 0 0 8px;
    }
  }

  .btn-action {
    font-size: ${(props) => props.theme.font.size.base};
    &:hover span {
      text-decoration: underline;
    }
  }

  input[type='text'] {
    width: 100%;
    border: solid 1px transparent;
    outline: none !important;
    background-color: inherit;

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

  /* Decorated Input Styles */
  select.choices-dropdown {
    width: 100%;
    padding: 4px 8px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: inherit;
    color: inherit;
    font-size: inherit;
    font-family: inherit;
    cursor: pointer;
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.input?.focusBorder || props.theme.input?.border?.active};
    }

    &.error {
      border-color: ${(props) => props.theme.colors?.text?.danger || '#dc3545'};
    }
  }
`;

export default Wrapper;

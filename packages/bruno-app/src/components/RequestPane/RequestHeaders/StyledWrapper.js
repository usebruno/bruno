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

  .btn-action {
    font-size: ${(props) => props.theme.font.size.base};
    &:hover span {
      text-decoration: underline;
    }
  }

  .bulk-edit-bar {
    position: sticky;
    bottom: 0;
    background: ${(props) => props.theme.bg};
    padding-top: 8px;
    padding-bottom: 4px;
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
`;

export default Wrapper;

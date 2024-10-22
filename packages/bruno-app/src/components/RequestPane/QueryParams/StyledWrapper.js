import styled from 'styled-components';

const Wrapper = styled.div`
  div.title {
    color: var(--color-tab-inactive);
  }
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

  td {
    &:nth-child(1) {
      padding: 0 0 0 8px;
    }
  }

  .btn-add-param {
    font-size: 0.8125rem;
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
`;

export default Wrapper;

import styled from 'styled-components';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: 0.8125rem;
      user-select: none;
      font-weight: 600;
    }
    td {
      padding: 6px 10px;

      &:nth-child(2) {
        width: 130px;
      }

      &:nth-child(4) {
        width: 70px;
      }

      select {
        background-color: transparent;
      }
    }
  }

  .btn-add-assertion {
    font-size: 0.8125rem;
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
  option {
    background-color: ${(props) => props.theme.bg};
  }
`;

export default Wrapper;

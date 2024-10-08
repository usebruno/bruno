import styled from 'styled-components';

const Wrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;
    font-weight: 600;
    table-layout: fixed;

    thead,
    td {
      border: 1px solid ${(props) => props.theme.collection.environment.settings.gridBorder};
      padding: 4px 10px;

      &:nth-child(1),
      &:nth-child(4) {
        width: 70px;
      }
      &:nth-child(5) {
        width: 40px;
      }

      &:nth-child(2) {
        width: 25%;
      }
    }

    thead {
      color: ${(props) => props.theme.table.thead.color};
      font-size: 0.8125rem;
      user-select: none;
    }
    thead td {
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
    background-color: transparent;

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

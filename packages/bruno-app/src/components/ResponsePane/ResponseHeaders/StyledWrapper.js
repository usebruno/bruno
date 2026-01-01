import styled from 'styled-components';

const Wrapper = styled.div`
  .table-wrapper {
    border: 1px solid ${(props) => props.theme.table.border};
    border-radius: 4px;
    overflow: hidden;
  }

  table {
    width: 100%;
    border-collapse: collapse;

    thead {
      color: #777777;
      font-size: ${(props) => props.theme.font.size.sm};
      font-weight: 500;

      td {
        border-top: none;
      }
    }

    td {
      border: 1px solid ${(props) => props.theme.table.border};
      padding: 6px 10px;

      &:first-child {
        border-left: none;
      }

      &:last-child {
        border-right: none;
      }

      &.value {
        word-break: break-all;
      }
    }

    tbody {
      tr:nth-child(odd) {
        background-color: ${(props) => props.theme.table.striped};
      }

      tr:last-child td {
        border-bottom: none;
      }
    }
  }
`;

export default Wrapper;

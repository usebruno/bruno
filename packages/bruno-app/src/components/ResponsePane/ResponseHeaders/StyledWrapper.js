import styled from 'styled-components';

const Wrapper = styled.div`
  height: auto;
  max-height: calc(100vh - 210px);
  overflow-y: auto;

  table {
    width: 100%;
    border-collapse: collapse;

    thead {
      color: #777777;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    td {
      padding: 6px 10px;

      &.value {
        word-break: break-all;
      }
    }

    tbody {
      tr:nth-child(odd) {
        background-color: ${(props) => props.theme.table.striped};
      }
    }
  }
`;

export default Wrapper;

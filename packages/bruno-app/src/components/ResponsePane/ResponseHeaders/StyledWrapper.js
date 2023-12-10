import styled from 'styled-components';

const Wrapper = styled.div`
  /* This is a hack to force headers-pane use all available space. Denoted by --hack-- */
  position: relative;

  table {
    width: 100%;
    border-collapse: collapse;

    /* --hack-- */
    position: absolute;
    top: 0;
    bottom: 0;
    height: 100%;

    thead {
      color: #777777;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      position: sticky;
      top: 0;
      background: #1c1c1c;
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

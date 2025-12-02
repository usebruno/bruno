import styled from 'styled-components';

const StyledWrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;

    thead {
      color: #777777;
      font-size: ${(props) => props.theme.font.size.sm};
      font-weight: 500;
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

export default StyledWrapper;

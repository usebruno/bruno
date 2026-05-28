import styled from 'styled-components';

const StyledWrapper = styled.div`
  table {
    width: 100%;
    border-collapse: collapse;

    thead {
      color: ${(props) => props.theme.colors.text.muted};
      font-size: ${(props) => props.theme.font.size.xs};
      font-weight: 500;
      text-transform: uppercase;
    }

    td {
      padding: 8px 10px;
      font-size: ${(props) => props.theme.font.size.sm};

      &.key {
        color: ${(props) => props.theme.colors.text.subtext1};
        font-weight: 500;
      }

      &.value {
        word-break: break-all;
        color: ${(props) => props.theme.text};
      }
    }

    tbody {
      tr:nth-child(odd) {
        background-color: ${(props) => props.theme.table.striped};
      }
    }

    .empty-message {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }
`;

export default StyledWrapper;

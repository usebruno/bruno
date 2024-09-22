import styled from 'styled-components';
import StyledCopyToClipboard from './StyledCopyToClipboard';

const StyledWrapper = styled.div`
  table {
    thead,
    td {
      border: 1px solid ${(props) => props.theme.table.border};
      position: relative;

      li {
        background-color: ${(props) => props.theme.bg} !important;
      }
    }

    tr {
      ${StyledCopyToClipboard} {
        opacity: 0;
      }

      &:hover ${StyledCopyToClipboard} {
        opacity: 0.5;
      }
    }
  }

  .muted {
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;

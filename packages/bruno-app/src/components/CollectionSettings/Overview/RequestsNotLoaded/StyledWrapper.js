import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  &.card {
    background-color: ${(props) => props.theme.requestTabPanel.card.bg};

    .title {
      border-top: 1px solid ${(props) => props.theme.table.border};
      border-left: 1px solid ${(props) => props.theme.table.border};
      border-right: 1px solid ${(props) => props.theme.table.border};

      border-top-left-radius: 3px;
      border-top-right-radius: 3px;

      background-color: ${(props) => props.theme.status.warning.background};
    }

    .warning-icon {
      color: ${(props) => props.theme.status.warning.text};
    }

    .table {
      thead {
        color: ${(props) => props.theme.table.thead.color} !important;
        background: ${(props) => props.theme.sidebar.bg};
      }
    }
  }
`;

export default StyledWrapper;

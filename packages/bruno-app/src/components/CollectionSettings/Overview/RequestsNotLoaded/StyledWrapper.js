import styled from 'styled-components';

const StyledWrapper = styled.div`
  &.card {
    background-color: ${(props) => props.theme.requestTabPanel.card.bg};

    .title {
      border-top: 1px solid ${(props) => props.theme.border.BORDER0};
      border-left: 1px solid ${(props) => props.theme.border.BORDER0};
      border-right: 1px solid ${(props) => props.theme.border.BORDER0};

      border-top-left-radius: 3px;
      border-top-right-radius: 3px;
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

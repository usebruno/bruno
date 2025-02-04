import styled from 'styled-components';

const StyledWrapper = styled.div`
  &.card {
    background-color: ${(props) => props.theme.requestTabPanel.card.bg};

    .title {
      border-top: 1px solid ${(props) => props.theme.requestTabPanel.cardTable.border};
      border-left: 1px solid ${(props) => props.theme.requestTabPanel.cardTable.border};
      border-right: 1px solid ${(props) => props.theme.requestTabPanel.cardTable.border};

      border-top-left-radius: 3px;
      border-top-right-radius: 3px;
    }

    .table {
      thead {
        background-color: ${(props) => props.theme.requestTabPanel.cardTable.table.thead.bg};
        color: ${(props) => props.theme.requestTabPanel.cardTable.table.thead.color};
      }
    }
  }
`;

export default StyledWrapper;

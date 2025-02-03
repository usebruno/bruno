import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.card {
    background: ${(props) => props.theme.requestTabPanel.card.bg};
    border: 1px solid ${(props) => props.theme.requestTabPanel.card.border};

    div.hr {
      border-bottom: 1px solid ${(props) => props.theme.requestTabPanel.card.hr};
      height: 1px;
    }

    div.border-top {
      border-top: 1px solid ${(props) => props.theme.requestTabPanel.card.border};
    }
  }
`;

export default StyledWrapper;

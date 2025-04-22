import styled from 'styled-components';

const StyledWrapper = styled.div`
  padding-top: 20%;
  width: 100%;
  .send-icon {
    color: ${(props) => props.theme.requestTabPanel.responseSendIcon};
  }
`;

export default StyledWrapper;
import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  padding-top: 20%;
  width: 100%;

  .send-icon {
    color: ${(props) => props.theme.requestTabPanel.responseSendIcon};
  }

  &.vertical-layout {
    padding: 1rem;
    justify-content: center;
  }
`;

export default StyledWrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  padding-top: 20%;
  width: 100%;
  .send-icon {
    color: ${(props) => props.theme.background.surface2};
  }
`;

export default StyledWrapper;

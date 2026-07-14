import styled from 'styled-components';

const StyledWrapper = styled.div`
  .inherit-mode-text {
    color: ${(props) => props.theme.primary.text};
  }
`;

export default StyledWrapper;

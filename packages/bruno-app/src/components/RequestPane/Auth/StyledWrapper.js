import styled from 'styled-components';

const Wrapper = styled.div`
  .inherit-mode-text {
    color: ${(props) => props.theme.primary.text};
  }
  .inherit-mode-label {
  }
`;

export default Wrapper;

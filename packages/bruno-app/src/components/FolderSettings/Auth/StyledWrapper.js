import styled from 'styled-components';

const Wrapper = styled.div`
  label {
    font-size: 0.8125rem;
  }
  .single-line-editor-wrapper {
    max-width: 400px;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
  }
  .inherit-mode-text {
    color: ${(props) => props.theme.colors.text.yellow};
  }
`;

export default Wrapper; 
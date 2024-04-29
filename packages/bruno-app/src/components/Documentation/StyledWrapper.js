import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.CodeMirror {
    height: 100%;
  }

  div.code-mirror-wrapper {
    height: calc(100% - 35px);
  }
  .editing-mode {
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.yellow};
  }
  div.markdown-wrapper {
    height: calc(100% - 35px);
  }
`;

export default StyledWrapper;

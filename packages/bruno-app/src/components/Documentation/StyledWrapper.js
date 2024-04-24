import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.CodeMirror {
  }
  .editing-mode {
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.yellow};
  }
`;

export default StyledWrapper;

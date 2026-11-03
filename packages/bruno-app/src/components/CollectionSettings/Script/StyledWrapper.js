import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.CodeMirror {
    height: inherit;
  }

  div.title {
    color: ${(props) => props.theme.colors.text.subtext0};
  }
`;

export default StyledWrapper;

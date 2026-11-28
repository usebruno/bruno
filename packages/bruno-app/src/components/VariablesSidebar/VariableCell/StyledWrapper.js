import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;
  height: 100%;
  min-width: 0;

  &.is-editable {
    cursor: text;

    .CodeMirror,
    .CodeMirror-lines {
      cursor: text;
    }
  }
`;

export default StyledWrapper;

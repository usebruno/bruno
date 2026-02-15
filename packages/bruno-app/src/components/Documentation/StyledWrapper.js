import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  overflow-y: auto;
  position: relative;
  .editing-mode {
    cursor: pointer;
    position: sticky;
    z-index: 10;
    top: 0;
    background: ${(props) => props.theme.bg};
    padding-bottom: 0.5em;
  }
  .markdown-body {
    height: auto !important;
    overflow-y: visible !important;
  }
`;

export default StyledWrapper;

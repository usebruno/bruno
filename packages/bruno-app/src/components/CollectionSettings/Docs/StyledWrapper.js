import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  height: 100%;
  overflow-y: auto;

  .editing-mode {
    cursor: pointer;
    position: sticky;
    top: 0;
    z-index: 10;
    background: ${(props) => props.theme.bg};
    padding: 6px 0;
    margin-bottom: 10px;
    display: flex;
    justify-content: flex-end;
  }

  .markdown-body {
    height: auto !important;
  }
`;

export default StyledWrapper;

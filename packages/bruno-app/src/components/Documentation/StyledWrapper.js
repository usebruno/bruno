import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  overflow-y: auto;
  position: relative;

  .docs-tab-strip {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    flex-shrink: 0;
    min-width: 0;
    position: relative;
    z-index: 10;
    overflow: visible;
  }

  .docs-mode-switch {
    margin-left: auto;
    flex-shrink: 0;
  }

  .docs-toolbar-slot {
    flex: 1;
    min-width: 0;
    position: relative;
    overflow: visible;
  }

  .markdown-body {
    height: auto !important;
    overflow-y: visible !important;
  }
`;

export default StyledWrapper;

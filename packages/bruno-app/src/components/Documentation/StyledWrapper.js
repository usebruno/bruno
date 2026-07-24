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

  .docs-tabs {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .docs-tab {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    font-size: ${(props) => props.theme.font.size.sm};
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.text};
    }

    &.is-active {
      color: ${(props) => props.theme.text};
      border-bottom-color: ${(props) => props.theme.colors.text.yellow};
    }
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

import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;

  .tab {
    padding: 8px 16px;
    font-size: 13px;
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${(props) => props.theme.requestTabs.color};
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
    position: relative;

    &:hover {
      color: ${(props) => props.theme.requestTabs.icon.hoverColor};
      background: ${(props) => props.theme.requestTabs.icon.hoverBg};
    }

    &.active {
      color: ${(props) => props.theme.tabs.active.color};
      border-bottom: solid 2px ${(props) => props.theme.tabs.active.border};
      background: ${(props) => props.theme.requestTabs.active.bg};
    }
  }

  div.CodeMirror {
    height: calc(100vh - 290px);
    background: ${(props) => props.theme.codemirror.bg};
  }
`;

export default StyledWrapper;
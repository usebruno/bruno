import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  overflow: hidden;
  background: ${props => props.theme.bg};
  border-radius: 4px;

  .CodeMirror {
    height: 100%;
    font-family: ${props => (props.font === 'default' ? 'monospace' : props.font)};
    font-size: ${props => (props.fontSize ? props.fontSize : '13px')};
  }

  .accordion-header {
    background-color: ${props => props.theme.requestTabPanel.card.bg};

    &:hover {
      background-color: ${props => props.theme.plainGrid.hoverBg};
    }

    &.open {
      background-color: ${props => props.theme.plainGrid.hoverBg};
    }
  }

  .error-header {
    background-color: ${props => (props.theme.bg === '#1e1e1e' ? 'rgba(185, 28, 28, 0.1)' : '#fee2e2')};
  }

  .error-text {
    color: ${props => props.theme.colors.text.danger};
  }

  div.tabs {
    div.tab {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: 1.25rem;
      color: var(--color-tab-inactive);
      cursor: pointer;

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &.active {
        color: ${props => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${props => props.theme.tabs.active.border} !important;
      }
    }
  }

  .stream-status {
    display: inline-flex;
    align-items: center;

    &.complete {
      color: ${props => props.theme.colors.text.green};
    }

    &.cancelled {
      color: ${props => props.theme.colors.text.danger};
    }

    &.streaming {
      color: ${props => props.theme.colors.text.blue};
    }
  }

  .message-counter {
    display: inline-flex;
    align-items: center;
    margin-left: 10px;
  }

  .response-list {
    max-height: 500px;
    overflow-y: auto;
  }

  .response-message {
    margin-bottom: 8px;
    padding: 8px;
    border-radius: 4px;
    background-color: var(--color-panel-background);
  }
`;

export default StyledWrapper;

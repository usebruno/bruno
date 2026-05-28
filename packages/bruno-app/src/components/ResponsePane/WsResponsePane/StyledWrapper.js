import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  overflow: hidden;
  border-radius: 4px;

  div.tabs {
    div.tab {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: ${(props) => props.theme.tabs.marginRight};
      color: ${(props) => props.theme.colors.text.subtext0};
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
        font-weight: ${(props) => props.theme.tabs.active.fontWeight} !important;
        color: ${(props) => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${(props) => props.theme.tabs.active.border} !important;
      }
    }
  }

  .stream-status {
    display: inline-flex;
    align-items: center;

    &.complete {
      color: ${(props) => props.theme.colors.text.green};
    }

    &.cancelled {
      color: ${(props) => props.theme.colors.text.danger};
    }

    &.streaming {
      color: ${(props) => props.theme.colors.text.blue};
    }
  }

  .message-counter {
    display: inline-flex;
    align-items: center;
    margin-left: 10px;
  }

  div.tabs .action-icon {
    color: ${(props) => props.theme.dropdown.iconColor};
    opacity: 0.8;

    &:hover {
      color: ${(props) => props.theme.text};
      opacity: 1;
      background-color: ${(props) => props.theme.workspace.button.bg};
    }
  }
`;

export default StyledWrapper;

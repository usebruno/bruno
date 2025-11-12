import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  overflow: hidden;
  background: ${(props) => props.theme.bg};
  border-radius: 4px;

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
`;

export default StyledWrapper;

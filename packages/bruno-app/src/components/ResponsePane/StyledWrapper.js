import styled from 'styled-components';

const StyledWrapper = styled.div`
  overflow: hidden;
  min-width: 0;

  > div:first-child {
    overflow: hidden;
    min-width: 0;
  }

  div.tabs {
    overflow: hidden;
    min-width: 0;
    max-width: 100%;

    > div:first-child {
      overflow: hidden;
      min-width: 0;
      max-width: 100%;
    }

    div.tab {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: ${(props) => props.theme.tabs.marginRight};
      color: var(--color-tab-inactive);
      cursor: pointer;
      flex-shrink: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

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

  .right-side-container {
    min-width: 0;
    flex-shrink: 1;
    flex-grow: 1;
  }

  .response-pane-status {
    min-width: 0;
    flex-shrink: 1;
    flex-grow: 0;
  }

  .response-pane-actions {
    min-width: 0;
    flex-shrink: 1;
    flex-grow: 0;
  }

  .some-tests-failed {
    color: ${(props) => props.theme.colors.text.danger} !important;
  }

  .all-tests-passed {
    color: ${(props) => props.theme.colors.text.green} !important;
  }

  .separator {
    height: 16px;
    border-left: 1px solid ${(props) => props.theme.preferences.sidebar.border};
    margin: 0 8px;
  }
`;

export default StyledWrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  &.tabs {
    overflow: hidden;
    min-width: 0;

    > div:first-child {
      overflow: hidden;
      min-width: 0;
      flex-shrink: 1;
    }

    .more-tabs {
      color: ${(props) => props.theme.colors.text.subtext0} !important;
      border-bottom: solid 2px transparent;

      &:hover {
        color: ${(props) => props.theme.tabs.active.color} !important;
      }
    }

    .tab {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: ${(props) => props.theme.tabs.marginRight};
      color: ${(props) => props.theme.colors.text.subtext0};
      cursor: pointer;
      white-space: nowrap;
      vertical-align: middle;
      flex-shrink: 0;

      &:focus,
      &:active,
      &:focus-within,
      &:focus-visible,
      &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &:hover {
        color: ${(props) => props.theme.tabs.active.color} !important;
      }

      &.active {
        font-weight: ${(props) => props.theme.tabs.active.fontWeight} !important;
        color: ${(props) => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${(props) => props.theme.tabs.active.border} !important;
      }

      .content-indicator {
        color: ${(props) => props.theme.text};
      }

      sup {
        display: inline-flex;
        align-items: center;
        line-height: 1;
        vertical-align: baseline;
        margin-left: 0;
      }
    }
  }
`;

export default StyledWrapper;

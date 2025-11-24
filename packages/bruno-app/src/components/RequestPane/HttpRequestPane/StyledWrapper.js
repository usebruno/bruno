import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.tabs {
    min-height: 32px;
    
    div.tab {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: 1.25rem;
      color: var(--color-tab-inactive);
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

      &.active {
        color: ${(props) => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${(props) => props.theme.tabs.active.border} !important;
      }

      .content-indicator {
        color: ${(props) => props.theme.text}
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

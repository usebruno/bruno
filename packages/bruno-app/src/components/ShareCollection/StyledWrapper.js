import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tabs {
    .tab {
      padding: 6px 0px;
      border: none;
      border-bottom: solid 2px transparent;
      margin-right: ${(props) => props.theme.tabs.marginRight};
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
        font-weight: ${(props) => props.theme.tabs.active.fontWeight} !important;
        color: ${(props) => props.theme.tabs.active.color} !important;
        border-bottom: solid 2px ${(props) => props.theme.tabs.active.border} !important;
      }
    }
  }

  .export-option {
    border: 1px solid ${(props) => props.theme.shareCollection.exportOption.border};
    transition: all 0.2s ease;

    &:hover:not(.disabled) {
      background-color: ${(props) => props.theme.shareCollection.exportOption.hoverBg};
    }

    &.disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .warning-banner {
    background-color: ${(props) => props.theme.shareCollection.warning.bg};
    color: ${(props) => props.theme.shareCollection.warning.text};
    border-bottom: 1px solid ${(props) => props.theme.shareCollection.warning.border};
  }
`;

export default StyledWrapper;

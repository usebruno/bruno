import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: ${(props) => props.theme.requestTabs.bottomBorder};
    z-index: 0;
  }

  .tabs-scroll-container {
    overflow-x: auto;
    overflow-y: clip;
    padding-bottom: 10px;
    margin-bottom: -10px;

    &::-webkit-scrollbar {
      display: none;
    }

    scrollbar-width: none;

    ul {
      margin-bottom: 0;
      overflow: visible;
    }
  }

  ul {
    padding: 0 3px;
    margin: 0;
    display: flex;
    align-items: flex-end;
    position: relative;

    &::-webkit-scrollbar {
      display: none;
    }

    scrollbar-width: none;

    li {
      display: inline-flex;
      max-width: 180px;
      min-width: 80px;
      list-style: none;
      cursor: pointer;
      font-size: 0.8125rem;
      position: relative;
      margin-right: 3px;
      color: ${(props) => props.theme.requestTabs.color};
      background: transparent;
      border: 1px solid transparent;
      padding: 6px 0;
      flex-shrink: 0;
      transition: background-color 0.15s ease;
      margin-bottom: 3px;

      .tab-container {
        width: 100%;
        position: relative;
        overflow: hidden;
      }

      &:not(.active) {
        background: ${(props) => props.theme.requestTabs.bg};
        border-color: transparent;
        border-radius: ${(props) => props.theme.border.radius.base};
      }

      &:nth-last-child(1) {
        margin-right: 4px;
      }

      &.has-overflow:not(:hover) .tab-name {
        mask-image: linear-gradient(
          to right,
          ${(props) => props.theme.requestTabs.color} 0%,
          ${(props) => props.theme.requestTabs.color} calc(100% - 12px),
          transparent 100%
        );
        -webkit-mask-image: linear-gradient(
          to right,
          ${(props) => props.theme.requestTabs.color} 0%,
          ${(props) => props.theme.requestTabs.color} calc(100% - 12px),
          transparent 100%
        );
      }

      &.has-overflow:hover .tab-name {
        mask-image: linear-gradient(
          to right,
          ${(props) => props.theme.requestTabs.color} 0%,
          ${(props) => props.theme.requestTabs.color} calc(100% - 8px),
          transparent 100%
        );
        -webkit-mask-image: linear-gradient(
          to right,
          ${(props) => props.theme.requestTabs.color} 0%,
          ${(props) => props.theme.requestTabs.color} calc(100% - 8px),
          transparent 100%
        );
      }

      &.active {
        background: ${(props) => props.theme.bg || '#ffffff'};
        border: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
        border-bottom-color: ${(props) => props.theme.bg || '#ffffff'};
        border-radius: 8px 8px 0 0;
        z-index: 2;
        margin-bottom: -2px;
        padding-bottom: 12px;

        &::before {
          content: '';
          position: absolute;
          bottom: 1px;
          left: -8px;
          width: 8px;
          height: 8px;
          background: transparent;
          border-bottom-right-radius: 6px;
          box-shadow: 3px 3px 0 0 ${(props) => props.theme.bg || '#ffffff'};
          border-right: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
          border-bottom: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
        }

        &::after {
          content: '';
          position: absolute;
          bottom: 1px;
          right: -8px;
          width: 8px;
          height: 8px;
          background: transparent;
          border-bottom-left-radius: 6px;
          box-shadow: -3px 3px 0 0 ${(props) => props.theme.bg || '#ffffff'};
          border-left: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
          border-bottom: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
        }

        &.no-curves::before,
        &.no-curves::after {
          display: none;
        }
      }

      &.short-tab {
        width: 32px;
        min-width: 32px;
        max-width: 32px;
        padding: 5px 0;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        color: ${(props) => props.theme.requestTabs.shortTab.color};
        background-color: transparent;
        border: 1px solid transparent;
        border-radius: ${(props) => props.theme.border.radius.base};
        flex-shrink: 0;

        > div {
          padding: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: ${(props) => props.theme.border.radius.sm};
          transition: background-color 0.12s ease, color 0.12s ease;
        }

        svg {
          height: 20px;
          width: 20px;
        }

        &:hover {
          > div {
            background-color: ${(props) => props.theme.requestTabs.shortTab.hoverBg};
            color: ${(props) => props.theme.requestTabs.shortTab.hoverColor};
          }
        }
      }
    }
  }

  &.has-chevrons ul {
    padding-left: 0;
  }

  .tab-label {
    display: flex;
    overflow: hidden;
    align-items: center;
    position: relative;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
  }

  .tab-method {
    font-size: 0.6875rem;
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }

  .tab-name {
    position: relative;
    overflow: hidden;
    white-space: nowrap;
    font-size: 0.8125rem;
    padding-right: 2px;
  }

  .tab-icon {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .tab-close-btn {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.12s ease;
    color: ${(props) => props.theme.requestTabs.icon.color};
    opacity: 0;

    &:hover {
      background-color: ${(props) => props.theme.requestTabs.icon.hoverBg};
      color: ${(props) => props.theme.requestTabs.icon.hoverColor};
    }
  }

  li:hover .tab-close-btn,
  li.active .tab-close-btn {
    opacity: 1;
  }

  .tab-draft-indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${(props) => props.theme.colors.text.yellow || '#f0ad4e'};
    flex-shrink: 0;
  }

  .dropdown-divider {
    height: 1px;
    margin: 4px 0;
    background: ${(props) => props.theme.requestTabs.bottomBorder};
  }
`;

export default StyledWrapper;

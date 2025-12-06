import styled from 'styled-components';

const Wrapper = styled.div`
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
    padding: 0 2px;
    margin: 0;
    display: flex;
    align-items: flex-end;
    position: relative;
    z-index: 1;

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
      margin-bottom: 4px;

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
        margin-right: 10px;
      }

      &.has-overflow:not(:hover) .tab-name {
        mask-image: linear-gradient(
          to right,
          black 0%,
          black calc(100% - 24px),
          transparent 100%
        );
        -webkit-mask-image: linear-gradient(
          to right,
          black 0%,
          black calc(100% - 24px),
          transparent 100%
        );
      }

      &.has-overflow:hover .tab-name {
        mask-image: linear-gradient(
          to right,
          black 0%,
          black calc(100% - 8px),
          transparent 100%
        );
        -webkit-mask-image: linear-gradient(
          to right,
          black 0%,
          black calc(100% - 8px),
          transparent 100%
        );
      }

      &.active {
        background: ${(props) => props.theme.bg || '#ffffff'};
        border: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
        border-bottom-color: ${(props) => props.theme.bg || '#ffffff'};
        border-radius: 8px 8px 0 0;
        font-weight: 500;
        z-index: 2;
        margin-bottom: -2px;
        padding-bottom: 12px;

        &::before {
          content: '';
          position: absolute;
          bottom: -1px;
          left: -8px;
          width: 8px;
          height: 8px;
          background: transparent;
          border-bottom-right-radius: 8px;
          box-shadow: 2px 2px 0 0 ${(props) => props.theme.bg || '#ffffff'};
          border-right: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
          border-bottom: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
        }

        &::after {
          content: '';
          position: absolute;
          bottom: -1px;
          right: -8px;
          width: 8px;
          height: 8px;
          background: transparent;
          border-bottom-left-radius: 8px;
          box-shadow: -2px 2px 0 0 ${(props) => props.theme.bg || '#ffffff'};
          border-left: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
          border-bottom: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
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

        > div.home-icon-container {
          padding: 3px 7px;
        }

        &.choose-request {
          > div {
            padding: 3px 5px;
          }
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
`;

export default Wrapper;

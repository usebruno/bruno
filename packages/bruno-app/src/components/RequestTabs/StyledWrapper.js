import styled from 'styled-components';

const Wrapper = styled.div`
  border-bottom: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};

  ul {
    padding: 0;
    margin: 0;
    display: flex;
    overflow: scroll;

    &::-webkit-scrollbar {
      display: none;
    }

    scrollbar-width: none;

    li {
      display: inline-flex;
      max-width: 150px;
      border: 1px solid transparent;
      list-style: none;
      padding-top: 8px;
      padding-bottom: 8px;
      padding-left: 0;
      padding-right: 0;
      cursor: pointer;
      font-size: 0.8125rem;
      height: 38px;

      margin-right: 6px;
      color: ${(props) => props.theme.requestTabs.color};
      background: ${(props) => props.theme.requestTabs.bg};
      border-radius: 0;

      .tab-container {
        width: 100%;
      }

      &.active {
        background: ${(props) => props.theme.requestTabs.active.bg};
        font-weight: 500;
      }

      &.active {
        .close-icon-container .close-icon {
          display: block;
        }
      }

      &:hover {
        .close-icon-container .close-icon {
          display: block;
        }
      }

      &.short-tab {
        vertical-align: bottom;
        width: 34px;
        min-width: 34px;
        max-width: 34px;
        padding: 3px 0px;
        display: inline-flex;
        justify-content: center;
        color: ${(props) => props.theme.requestTabs.shortTab.color};
        background-color: ${(props) => props.theme.requestTabs.shortTab.bg};
        position: relative;
        top: -1px;

        > div {
          padding: 3px 4px;
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
          height: 22px;
        }

        &:hover {
          > div {
            background-color: ${(props) => props.theme.requestTabs.shortTab.hoverBg};
            color: ${(props) => props.theme.requestTabs.shortTab.hoverColor};
            border-radius: 3px;
          }
        }
      }
    }
  }
`;

export default Wrapper;

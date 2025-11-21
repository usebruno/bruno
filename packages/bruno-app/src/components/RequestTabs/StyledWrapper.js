import styled from 'styled-components';

const Wrapper = styled.div`
  background: ${(props) => props.theme.sidebar.bg};

  .tabs-bar{
    min-height: 40px;
    border-top: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
    border-bottom: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
  }

  ul {
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      display: none;
    }

    scrollbar-width: none;

    li {
      display: inline-flex;
      min-width: 100px;
      max-width: 180px;
      flex: 1 0 auto;
      border-right: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
      list-style: none;
      padding: 6px 12px;
      cursor: pointer;
      font-size: 0.8125rem;
      height: 36px;
      align-items: center;
      justify-content: center;
      color: ${(props) => props.theme.sidebar.muted};
      background: transparent;
      transition: all 0.2s ease;

      .tab-container {
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &.active {
        background: ${(props) => props.theme.bg};
        font-weight: 500;
        border-top: 2px solid #fa7d09;
        border-bottom: 1px solid transparent;
        color: ${(props) => props.theme.text};
        margin-bottom: -1px;
        z-index: 1;
      }

      &.active {
        .close-icon-container .close-icon {
          display: block;
        }
      }

      &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
        color: ${(props) => props.theme.text};
        .close-icon-container .close-icon {
          display: block;
        }
      }

      &.short-tab {
        min-width: 32px;
        max-width: 32px;
        padding: 0;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        color: ${(props) => props.theme.sidebar.muted};
        background-color: transparent;
        border-right: none;
        margin: 0;

        > div {
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        svg {
          height: 18px;
          width: 18px;
        }

        &:hover {
          > div {
            background-color: ${(props) => props.theme.sidebar.dropdownIcon.hoverBg};
            color: ${(props) => props.theme.text};
            border-radius: 4px;
          }
        }
      }
    }
  }
`;

export default Wrapper;

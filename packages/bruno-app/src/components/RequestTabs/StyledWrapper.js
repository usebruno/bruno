import styled from 'styled-components';

const Wrapper = styled.div`
  border-bottom: 1px solid transparent;
  background: #222222;

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
      border-right: 1px solid #333;
      list-style: none;
      padding: 8px 12px;
      cursor: pointer;
      font-size: 0.8125rem;
      height: 38px;
      align-items: center;
      justify-content: center;
      color: #999;
      background: transparent;
      transition: all 0.2s ease;

      .tab-container {
        width: 100%;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      &.active {
        background: #1e1e1e;
        font-weight: 500;
        border-top: 2px solid #fa7d09;
        border-bottom: 1px solid transparent;
        color: #fff;
        margin-bottom: -1px;
        z-index: 1;
      }

      &.active {
        .close-icon-container .close-icon {
          display: block;
        }
      }

      &:hover {
        background: #2a2a2a;
        color: #fff;
        .close-icon-container .close-icon {
          display: block;
        }
      }

      &.short-tab {
        min-width: 34px;
        max-width: 34px;
        padding: 0;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        color: #999;
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
            background-color: #333;
            color: #fff;
            border-radius: 4px;
          }
        }
      }
    }
  }
`;

export default Wrapper;

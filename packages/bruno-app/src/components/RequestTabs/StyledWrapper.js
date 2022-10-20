import styled from 'styled-components';

const Wrapper = styled.div`
  border-bottom: 1px solid var(--color-request-dragbar-background);

  ul {
    padding: 0;
    margin: 0;
    display: flex;
    position: relative;
    overflow: scroll;

    &::-webkit-scrollbar {
      display: none;
    }

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
      background: #f7f7f7;
      border-radius: 0;

      .tab-container {
        width: 100%;
      }

      &.active {
        background: #e7e7e7;
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
        color: rgb(117 117 117);
        position: relative;
        background-color: white;
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
            background-color: #eaeaea;
            color: rgb(76 76 76);
            border-radius: 3px;
          }
        }
      }
    }
  }
`;

export default Wrapper;

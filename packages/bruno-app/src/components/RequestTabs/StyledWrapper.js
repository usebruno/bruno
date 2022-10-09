import styled from 'styled-components';

const Wrapper = styled.div`
  border-bottom: 1px solid var(--color-layout-border);

  ul {
    padding: 0;
    margin: 0;
    display: flex;
    bottom: -1px;
    position: relative;
    overflow: scroll;

    &::-webkit-scrollbar {
      display: none;
    }

    li {
      display: inline-flex;
      width: 150px;
      min-width: 150px;
      max-width: 150px;
      border: 1px solid transparent;
      border-bottom: none;
      list-style: none;
      padding-top: 8px;
      padding-bottom: 8px;
      padding-left: 0;
      padding-right: 0;
      cursor: pointer;
      font-size: 0.8125rem;
      height: 38px;

      .tab-container {
        width: 100%;
        border-left: 1px solid #dcdcdc;
        border-right: 1px solid transparent;
      }

      &.active {
        border-color: var(--color-layout-border);
        background: #fff;
        border-radius: 5px 5px 0 0;

        .tab-container {
          border-left: 1px solid transparent;
        }
      }

      &.active {
        .close-icon-container .close-icon {
          display: block;
        }
      }

      &:hover{
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

    li.last-tab {
      .tab-container {
        border-right: 1px solid #dcdcdc;
      }

      &.active {
        .tab-container {
          border-right: 1px solid transparent;
        }
      }
    }

    li.active + li {
      .tab-container {
        border-left: 1px solid transparent;
      }
    }

    li:first-child {
      .tab-container {
        border-left: 1px solid transparent;
      }
    }
  }

  &.has-chevrons {
    ul {
      li:first-child {
        .tab-container {
          border-left: 1px solid #dcdcdc;
        }
      }
    }
  }
`;

export default Wrapper;

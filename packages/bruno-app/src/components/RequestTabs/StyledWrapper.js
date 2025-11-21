import styled from 'styled-components';

const Wrapper = styled.div`
  position: relative;

  /* Bottom border with gap for active tab */
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: ${(props) => props.theme.table?.border || '#E1E3E5'};
    z-index: 0;
  }

  ul {
    padding: 0 3px;
    margin: 0;
    display: flex;
    overflow: scroll;
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
      list-style: none;
      cursor: pointer;
      font-size: 0.8125rem;
      position: relative;
      margin-right: 4px;
      margin-bottom: 2px;
      color: ${(props) => props.theme.requestTabs.color};
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      padding: 6px 0;
      flex-shrink: 0;

      .tab-container {
        width: 100%;
      }

      /* Inactive tabs - pill style with subtle background */
      &:not(.active) {
        background: ${(props) => props.theme.requestTabs.inactive?.bg || '#F6F6F7'};
        border-color: transparent;
      }

      /* Active tab - border with curved corners that connect to content */
      &.active {
        background: ${(props) => props.theme.bg || '#fff'};
        border: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
        border-bottom: none;
        border-radius: 8px 8px 0 0;
        font-weight: 400;
        z-index: 2;
        margin-bottom: -1px;
        padding-bottom: 7px;

        /* Curved outward corners at the bottom using pseudo-elements */
        &::before,
        &::after {
          content: '';
          position: absolute;
          bottom: 0;
          width: 8px;
          height: 8px;
          background: transparent;
        }

        /* Left curved corner */
        &::before {
          left: -8px;
          border-bottom-right-radius: 8px;
          box-shadow: 4px 0 0 0 ${(props) => props.theme.bg || '#fff'};
          border-right: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
          border-bottom: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
        }

        /* Right curved corner */
        &::after {
          right: -8px;
          border-bottom-left-radius: 8px;
          box-shadow: -4px 0 0 0 ${(props) => props.theme.bg || '#fff'};
          border-left: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
          border-bottom: 1px solid ${(props) => props.theme.table?.border || '#E1E3E5'};
        }
      }

      &.active {
        .close-icon-container .close-icon {
          display: block;
          height: 25px !important;
        }
      }

      &:hover {
        .close-icon-container .close-icon {
          display: block;
          height: 20px;
        }
      }

      /* Short tabs for chevrons and add button */
      &.short-tab {
        width: 32px;
        min-width: 32px;
        max-width: 32px;
        padding: 4px 0;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        color: ${(props) => props.theme.requestTabs.shortTab.color};
        background-color: transparent;
        border: 1px solid transparent;
        border-radius: 6px;
        margin-bottom: 4px;
        flex-shrink: 0;

        > div {
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
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
          background-color: ${(props) => props.theme.requestTabs.shortTab.hoverBg || 'rgba(0, 0, 0, 0.05)'};
          
          > div {
            color: ${(props) => props.theme.requestTabs.shortTab.hoverColor};
          }
        }
      }
    }
  }
`;

export default Wrapper;

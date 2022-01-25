import styled from 'styled-components';

const StyledWrapper = styled.div`
  .react-tabs__tab-list {
    border-bottom: none !important;
    padding-top: 0;
    padding-left: 0 !important;
    display: flex;
    align-items: center;
    margin: 0;

    .react-tabs__tab {
      padding: 6px 0px;
      border: none;
      user-select: none;
      border-bottom: solid 2px transparent;
      margin-right: 20px;
      color: rgb(125 125 125);
      outline: none !important;

      &:focus, &:active, &:focus-within, &:focus-visible, &:target {
        outline: none !important;
        box-shadow: none !important;
      }

      &:after {
        display: none !important;
      }
    }
  }

  .react-tabs__tab--selected {
    border: none;
    color: #322e2c !important;
    border-bottom: solid 2px var(--color-tab-active-border) !important;
    border-color: var(--color-tab-active-border) !important;
    background: inherit;
    outline: none !important;
    box-shadow: none !important;

    &:focus, &:active, &:focus-within, &:focus-visible, &:target {
      border: none;
      outline: none !important;
      box-shadow: none !important;
      border-bottom: solid 2px var(--color-tab-active-border) !important;
      border-color: var(--color-tab-active-border) !important;
      background: inherit;
      outline: none !important;
      box-shadow: none !important;
    }
  }

`;

export default StyledWrapper;
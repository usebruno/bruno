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
  
  .share-button {
    display: flex;
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 10px;
    border: 1px solid ${(props) => props.theme.sidebar.collection.item.indentBorder};
    background-color: ${(props) => props.theme.sidebar.bg};
    color: ${(props) => props.theme.text};
    cursor: pointer;
    transition: all 0.1s ease;

    &:hover {
      background-color: ${(props) => props.theme.listItem.hoverBg};
    }
  }
`;

export default StyledWrapper;

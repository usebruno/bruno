import styled from 'styled-components';

const StyledWrapper = styled.div`
  div.tabs {
    div.tab {
      width: 100%;
      min-width: 120px;
      padding: 7px 10px;
      border: none;
      border-bottom: solid 2px transparent;
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
        color: ${(props) => props.theme.sidebar.color} !important;
        background: ${(props) => props.theme.sidebar.collection.item.bg};

        &:hover {
          background: ${(props) => props.theme.sidebar.collection.item.bg} !important;
        }
      }
    }
  }

  section.tab-panel {
    min-height: 300px;
  }
`;

export default StyledWrapper;

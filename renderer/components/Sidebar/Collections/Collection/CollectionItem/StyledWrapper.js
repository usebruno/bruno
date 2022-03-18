import styled from 'styled-components';

const Wrapper = styled.div`
  .menu-icon {
    display: none;
    flex-grow: 1;
    justify-content: flex-end;
  }

  .indent-block {
    border-right: solid 1px #e1e1e1;
  }

  .collection-item-name {
    height: 1.875rem;
    cursor: pointer;
    user-select: none;

    .rotate-90 {
      transform: rotateZ(90deg);
    }

    &:hover {
      background: #e7e7e7;
      .menu-icon {
        display: flex;
      }
    }

    .menu-icon {
      color: rgb(110 110 110);
    }

    &.item-focused-in-tab {
      background: var(--color-sidebar-collection-item-active-background);

      &:hover {
        background: var(--color-sidebar-collection-item-active-background) !important;
      }

      .indent-block {
        border-right: solid 1px var(--color-sidebar-collection-item-active-indent-border);
      }
    }

    div.tippy-box {
      position: relative;
      top: -0.625rem;
    }

    div.dropdown-item.delete-item {
      color: var(--color-text-danger);
      &:hover {
        background-color: var(--color-background-danger);
        color: white;
      }
    }
  }
`;

export default Wrapper;

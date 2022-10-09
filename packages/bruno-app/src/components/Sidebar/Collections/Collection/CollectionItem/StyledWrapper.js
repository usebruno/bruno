import styled from 'styled-components';

const Wrapper = styled.div`
  .menu-icon {
    color: rgb(110 110 110);

  .dropdown {
      div[aria-expanded="true"] {
        visibility: visible;
      }
      div[aria-expanded="false"] {
        visibility: hidden;
      }
    }
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

    span.item-name {
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    &:hover {
      background: #e7e7e7;
      .menu-icon {
        .dropdown {
          div[aria-expanded="false"] {
            visibility: visible;
          }
        }
      }
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

  &.is-dragging .collection-item-name {
    cursor: inherit;
  }
`;

export default Wrapper;

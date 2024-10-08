import styled from 'styled-components';

const Wrapper = styled.div`
  .menu-icon {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};

    .dropdown {
      div[aria-expanded='true'] {
        visibility: visible;
      }
      div[aria-expanded='false'] {
        visibility: hidden;
      }
    }
  }

  .indent-block {
    border-right: ${(props) => props.theme.sidebar.collection.item.indentBorder};
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

    &:hover,
    &.item-hovered {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      .menu-icon {
        .dropdown {
          div[aria-expanded='false'] {
            visibility: visible;
          }
        }
      }
    }

    &.item-target {
      background: #ccc3;
    }

    &.item-seperator {
      .seperator {
        bottom: 0px;
        position: absolute;
        height: 3px;
        width: 100%;
        background: #ccc3;
      }
      .seperator-blinker {
        bottom: 0px;
        position: absolute;
        height: 3px;
        width: 100%;
        background: #ccc3;
        animation: pulsing 0.25s infinite;
      }
    }

    @keyframes pulsing {
      0% {
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }

    &.item-focused-in-tab {
      background: ${(props) => props.theme.sidebar.collection.item.bg};

      &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.bg} !important;
      }

      .indent-block {
        border-right: ${(props) => props.theme.sidebar.collection.item.active.indentBorder} !important;
      }
    }

    div.tippy-box {
      position: relative;
      top: -0.625rem;
    }

    div.dropdown-item.delete-item {
      color: ${(props) => props.theme.colors.danger};
      &:hover {
        background-color: ${(props) => props.theme.colors.bg.danger} !important;
        color: white;
      }
    }
  }

  &.is-sidebar-dragging .collection-item-name {
    cursor: inherit;
  }
`;

export default Wrapper;

import styled from 'styled-components';

const Wrapper = styled.div`
  .collection-name {
    height: 1.875rem;
    cursor: pointer;
    user-select: none;
    padding-left: 8px;
    font-weight: 600;

    .rotate-90 {
      transform: rotateZ(90deg);
    }

    &.dnd-drag-over {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &.dnd-hl-drop-before {
      border-top: ${(props) => props.theme.sidebar.collection.item.dndPlacementHighlightBorder};
    }

    .collection-actions {
      .dropdown {
        div[aria-expanded='true'] {
          visibility: visible;
        }
        div[aria-expanded='false'] {
          visibility: hidden;
        }
      }

      svg {
        height: 22px;
        color: ${(props) => props.theme.sidebar.dropdownIcon.color};
      }
    }

    &:hover {
      .collection-actions {
        .dropdown {
          div[aria-expanded='false'] {
            visibility: visible;
          }
        }
      }
    }

    div.tippy-box {
      position: relative;
      top: -0.625rem;
      font-weight: 400;
    }

    div.dropdown-item.delete-collection {
      color: ${(props) => props.theme.colors.text.danger};
      &:hover {
        background-color: ${(props) => props.theme.colors.bg.danger};
        color: white;
      }
    }
  }

  #sidebar-collection-name {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
`;

export default Wrapper;

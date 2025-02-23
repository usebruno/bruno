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

    &.item-hovered {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      .collection-actions {
        .dropdown {
          div[aria-expanded='false'] {
            visibility: visible;
          }
        }
      }
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

  .collection-name.drop-target {
    border: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
    border-radius: 4px;
    background-color: ${(props) => props.theme.dragAndDrop.hoverBg};
    margin: -2px;
    transition: ${(props) => props.theme.dragAndDrop.transition};
    box-shadow: 0 0 0 2px ${(props) => props.theme.dragAndDrop.hoverBg};
  }

  #sidebar-collection-name {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
`;

export default Wrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  
  .menu-icon {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};

    .dropdown, .menu-icon-trigger {
      div[aria-expanded='true'] {
        visibility: visible;
      }
      div[aria-expanded='false'] {
        visibility: hidden;
      }
    }

    .menu-icon-trigger {
      display: none;
      width: 24px;
      height: 24px;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      &:hover {
        color: ${(props) => props.theme.sidebar.dropdownIcon.hoverColor || 'inherit'};
        background-color: ${(props) => props.theme.sidebar.dropdownIcon.hoverBg};
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
    position: relative;

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

    &.item-focused-in-tab {
      background: ${(props) => props.theme.sidebar.collection.item.bg};

      &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.bg} !important;
      }
    }
  }
`;

export default StyledWrapper;

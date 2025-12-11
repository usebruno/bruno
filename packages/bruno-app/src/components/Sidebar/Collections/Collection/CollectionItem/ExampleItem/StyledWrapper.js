import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  
  .menu-icon {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};
    visibility: hidden;
    transition: none;

    .action-icon {
      background: transparent !important;
      &:hover {
        background: transparent !important;
      }
    }

    .dropdown {
      div[aria-expanded='true'] {
        visibility: visible;
      }
      div[aria-expanded='false'] {
        visibility: visible;
      }
    }
  }

  .indent-block {
    border-right: ${(props) => props.theme.sidebar.collection.item.indentBorder};
  }

  .collection-item-name {
    height: 1.6rem;
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
        visibility: visible;
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

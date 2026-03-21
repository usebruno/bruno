import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;
  
  .menu-icon {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};
    visibility: hidden;

    .dropdown, .menu-icon-trigger {
      div[aria-expanded='true'] {
        visibility: visible;
      }
      div[aria-expanded='false'] {
        visibility: visible;
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

  .example-icon {
    color: ${(props) => props.theme.sidebar.collection.item.example.iconColor};
  }

`;

export default StyledWrapper;

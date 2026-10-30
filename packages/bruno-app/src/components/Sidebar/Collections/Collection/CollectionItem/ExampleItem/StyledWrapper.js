import styled from 'styled-components';

const StyledWrapper = styled.div`
  position: relative;

  .indent-block {
    border-right: 1px solid ${(props) => props.theme.sidebar.collection.item.indentBorder};
  }

  .menu-icon {
    color: ${(props) => props.theme.sidebar.dropdownIcon.color};
    visibility: hidden;

    .dropdown {
      div[aria-expanded='true'] {
        visibility: visible;
      }
      div[aria-expanded='false'] {
        visibility: visible;
      }
    }
  }

  &.collection-item-name {
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
    &.item-hovered,
    &.item-keyboard-focused {
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

    &.item-keyboard-focused {
      border-top: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
      border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
      outline: none;
    }

    &.drag-disabled:active {
      cursor: not-allowed !important;
    }
  }

  .example-icon {
    color: ${(props) => props.theme.sidebar.collection.item.example.iconColor};
  }

`;

export default StyledWrapper;

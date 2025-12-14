import styled from 'styled-components';

const Wrapper = styled.div`
  .collection-name {
    height: 1.6rem;
    cursor: pointer;
    user-select: none;
    padding-left: 4px;
    border: ${(props) => props.theme.dragAndDrop.borderStyle} transparent;

    .rotate-90 {
      transform: rotateZ(90deg);
    }
    .collection-actions {
      visibility: hidden;
    }

    &:hover {
      .collection-actions {
        visibility: visible;
      }
    }

    &.item-hovered {
      border-top: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
      border-bottom: 2px solid transparent;
    }

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
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

    &.drop-target {
      border: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
      background-color: ${(props) => props.theme.dragAndDrop.hoverBg};
      transition: ${(props) => props.theme.dragAndDrop.transition};
    }

    &.drop-target-above {
      border: none;
      border-top: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
      margin-top: -2px;
      background: transparent;
      transition: ${(props) => props.theme.dragAndDrop.transition};
    }

    &.drop-target-below {
      border: none;
      border-bottom: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
      margin-bottom: -2px;
      background: transparent;
      transition: ${(props) => props.theme.dragAndDrop.transition};
    }

    &.collection-focused-in-tab {
      background: ${(props) => props.theme.sidebar.collection.item.bg};

      &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.bg} !important;
      }
    }

    &.collection-keyboard-focused {
      background: ${(props) => props.theme.sidebar.collection.item.keyboardFocusBg};
      outline: none;

      &:hover {
        background: ${(props) => props.theme.sidebar.collection.item.keyboardFocusBg} !important;
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

import styled from 'styled-components';
import sidebarRowStyles from 'components/Sidebar/SidebarRowStyles';

const Wrapper = styled.div`
  .collection-name {
    ${sidebarRowStyles({ selectedClass: 'collection-focused-in-tab', keyboardFocusedClass: 'collection-keyboard-focused' })}

    .rotate-90 {
      transform: rotateZ(90deg);
    }
    &.item-hovered {
      border-top: ${(props) => props.theme.dragAndDrop.borderStyle} ${(props) => props.theme.dragAndDrop.border};
      border-bottom: 2px solid transparent;
    }

    &.drag-disabled:active {
      cursor: not-allowed !important;
    }

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    div.tippy-box {
      position: relative;
      top: -0.625rem;
      font-weight: 400;
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

  }

  #sidebar-collection-name {
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .indent-block {
    border-right: 1px solid ${(props) => props.theme.sidebar.collection.item.indentBorder};
  }

  .empty-collection-message {
    display: flex;
    align-items: center;
    height: 1.6rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.sidebar.muted};

    .add-request-link {
      color: ${(props) => props.theme.textLink};
      cursor: pointer;
    }
  }
`;

export default Wrapper;

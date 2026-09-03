import { css } from 'styled-components';

const sidebarRowStyles = ({ selectedClass, keyboardFocusedClass }) => css`
  height: 1.6rem;
  cursor: pointer;
  user-select: none;
  padding-left: 4px;
  border-left: 4px solid transparent;

  .collection-actions {
    visibility: hidden;
  }

  &:hover,
  &:focus-within,
  &.${keyboardFocusedClass} {
    background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    .collection-actions {
      visibility: visible;
      background-color: transparent !important;
    }
  }

  .collection-actions[aria-expanded='true'] {
    visibility: visible;
  }

  &.${selectedClass} {
    background: ${(props) => props.theme.sidebar.collection.item.bg};
    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.bg} !important;
    }
  }

  &.${keyboardFocusedClass} {
    border-top: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
    border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
    outline: none;
  }
`;

export default sidebarRowStyles;

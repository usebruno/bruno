import styled from 'styled-components';
import { transparentize } from 'polished';

const ToolbarStyledWrapper = styled.div`
  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    min-width: 0;
    position: relative;
    flex-shrink: 0;
  }

  .editor-toolbar-measure {
    position: absolute;
    visibility: hidden;
    pointer-events: none;
    display: flex;
    align-items: center;
    gap: 4px;
    height: 0;
    overflow: hidden;
  }

  .heading-dropdown-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid ${(props) => props.theme.dropdown.separator};
    background: ${(props) => props.theme.dropdown.bg};
    color: ${(props) => props.theme.dropdown.color};
    font-size: ${(props) => props.theme.font.size.sm};
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    &.is-active {
      background: ${(props) => transparentize(1 - 0.12, props.theme.dropdown.selectedColor)};
      color: ${(props) => props.theme.dropdown.selectedColor};
      border-color: ${(props) => props.theme.dropdown.selectedColor};
    }
  }

  .editor-toolbar-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .toolbar-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 4px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: ${(props) => props.theme.dropdown.iconColor};
    cursor: pointer;

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.dropdown.hoverBg};
      color: ${(props) => props.theme.dropdown.color};
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    &.is-active {
      background: ${(props) => transparentize(1 - 0.12, props.theme.dropdown.selectedColor)};
      color: ${(props) => props.theme.dropdown.selectedColor};
    }

    &.is-active:disabled {
      opacity: 1;
      cursor: not-allowed;
    }
  }

  .toolbar-btn-label {
    font-size: ${(props) => props.theme.font.size.sm};
    white-space: nowrap;
  }

  .toolbar-overflow-btn {
    flex-shrink: 0;
  }
`;

export default ToolbarStyledWrapper;

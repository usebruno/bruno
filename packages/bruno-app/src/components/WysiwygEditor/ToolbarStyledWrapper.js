import styled from 'styled-components';

const ToolbarStyledWrapper = styled.div`
  .docs-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    min-width: 0;
    position: relative;
    flex-shrink: 0;
  }

  .docs-toolbar-measure {
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
    padding: 4px 8px;
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
      background: ${(props) => props.theme.dropdown.hoverBg};
      color: ${(props) => props.theme.dropdown.selectedColor};
      border-color: ${(props) => props.theme.dropdown.selectedColor};
    }
  }

  .docs-toolbar-actions {
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
      background: ${(props) => props.theme.dropdown.hoverBg};
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

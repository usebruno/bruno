import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.theme.bg};
  transition: background-color 0.15s ease;
  user-select: none;

  &:hover {
    background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
  }

  &:focus {
    outline: none;
  }

  .panel-label {
    font-size: 10px;
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .expand-icon {
    color: ${(props) => props.theme.colors.text.muted};
    opacity: 0.6;
    flex-shrink: 0;
  }

  &:hover .expand-icon {
    opacity: 1;
    color: ${(props) => props.theme.text};
  }

  &:hover .panel-label {
    color: ${(props) => props.theme.text};
  }

  /* Horizontal layout - panels stacked on left or right */
  &.horizontal {
    width: 32px;
    min-width: 32px;
    height: 100%;
    cursor: pointer;
    border-left: 1px solid ${(props) => props.theme.requestTabPanel.dragbar.border};
    border-right: 1px solid ${(props) => props.theme.requestTabPanel.dragbar.border};
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      width: 8px;
      height: 100%;
      cursor: col-resize;
      z-index: 2;
    }

    .indicator-content {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-90deg);
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 6px;
      white-space: nowrap;
    }

    &.request {
      border-left: none;
      &::before { right: -4px; }
    }

    &.response {
      border-right: none;
      &::before { left: -4px; }
    }
  }

  /* Vertical layout - panels stacked on top or bottom */
  &.vertical {
    width: 100%;
    height: 28px;
    min-height: 28px;
    flex-direction: row;
    cursor: pointer;
    border-top: 1px solid ${(props) => props.theme.requestTabPanel.dragbar.border};
    border-bottom: 1px solid ${(props) => props.theme.requestTabPanel.dragbar.border};
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      width: 100%;
      height: 8px;
      cursor: row-resize;
      z-index: 2;
    }

    .indicator-content {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 6px;
    }

    &.request {
      border-top: none;
      &::before { bottom: -4px; }
    }

    &.response {
      border-bottom: none;
      &::before { top: -4px; }
    }
  }
`;

export default StyledWrapper;

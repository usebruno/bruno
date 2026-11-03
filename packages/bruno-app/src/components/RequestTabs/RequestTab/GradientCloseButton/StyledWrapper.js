import styled from 'styled-components';

const StyledWrapper = styled.div.attrs((props) => ({
  style: {
    '--gradient-color': props.theme.requestTabs.bg,
    '--gradient-color-active': props.theme.bg
  }
}))`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  position: absolute;
  width: 44px;
  height: 100%;
  right: 0;
  top: 0;
  padding-right: 4px;
  
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    var(--gradient-color) 40%
  );
  
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;

  li.active & {
    background-image: linear-gradient(
      90deg,
      transparent 0%,
      var(--gradient-color-active) 40%
    );
  }

  li:hover &:not(.no-close),
  &.has-changes {
    opacity: 1;
    pointer-events: auto;
  }

  .close-icon-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 22px;
    height: 22px;
    border-radius: ${(props) => props.theme.border.radius.base};
    cursor: pointer;
    transition: background-color 0.12s ease;

    &:hover {
      background-color: ${(props) => props.theme.requestTabs.icon.hoverBg};

      .close-icon {
        color: ${(props) => props.theme.requestTabs.icon.hoverColor};
      }
    }
  }

  &.no-close .close-icon-container {
    &:hover {
      background-color: transparent;
    }
  }

  .close-icon {
    color: ${(props) => props.theme.requestTabs.icon.color};
    width: 12px;
    height: 12px;
    transition: color 0.12s ease;
  }

  .has-changes-icon {
    width: 8px;
    height: 8px;
  }

  .draft-icon-wrapper { 
    display: none; 
  }
  
  .close-icon-wrapper { 
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &.has-changes:not(li:hover &) {
    .draft-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .close-icon-wrapper {
      display: none;
    }
  }

  /* Closable tabs: hovering shows the close icon, replacing the draft icon */
  li:hover &:not(.no-close) {
    .draft-icon-wrapper {
      display: none;
    }
    .close-icon-wrapper {
      display: flex;
    }
  }

  /* Non-closable tabs with changes: keep the draft icon visible even on hover */
  &.no-close.has-changes {
    .draft-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .close-icon-wrapper {
      display: none;
    }
  }
`;

export default StyledWrapper;

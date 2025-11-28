import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  position: absolute;
  width: 50px;
  height: 100%;
  right: 0;
  top: 0;
  padding-right: 2px;
  background: linear-gradient(90deg, transparent 0%, ${(props) => props.theme.requestTabs.bg} 50%);
  z-index: 2;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.12s linear;

  /* Show on tab hover or when has changes */
  li:hover &,
  &.has-changes {
    opacity: 1;
    pointer-events: auto;
  }

  /* Active tab uses active background color */
  li.active & {
    background: linear-gradient(90deg, transparent 0%, ${(props) => props.theme.requestTabs.active.bg} 50%);
  }

  .close-icon-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 20px;
    min-width: 24px;
    border-radius: 3px;

    &:hover {
      background-color: ${(props) => props.theme.requestTabs.icon.hoverBg};

      .close-icon {
        color: ${(props) => props.theme.requestTabs.icon.hoverColor};
      }
    }
  }

  .close-icon {
    color: ${(props) => props.theme.requestTabs.icon.color};
    width: 8px;
    padding: 6px 0;
  }

  .has-changes-icon {
    height: 24px;
  }

  /* Default: show close icon, hide draft icon */
  .draft-icon-wrapper { display: none; }
  .close-icon-wrapper { display: flex; }

  /* Has changes (not hovered): show draft icon */
  &.has-changes:not(li:hover &) {
    .draft-icon-wrapper { display: flex; }
    .close-icon-wrapper { display: none; }
  }
`;

export default StyledWrapper;

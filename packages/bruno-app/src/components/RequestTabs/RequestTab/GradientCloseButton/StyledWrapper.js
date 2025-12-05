import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  position: absolute;
  width: 44px;
  height: 100%;
  right: 0;
  top: 0;
  padding-right: 4px;
  z-index: 3;
  
  background: linear-gradient(
    90deg,
    transparent 0%,
    ${(props) => props.theme.requestTabs.bg} 40%
  );
  
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;

  li.active & {
    background: linear-gradient(
      90deg,
      transparent 0%,
      ${(props) => props.theme.bg || '#ffffff'} 40%
    );
  }

  li:hover &,
  &.has-changes {
    opacity: 1;
    pointer-events: auto;
  }

  .close-icon-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 24px;
    height: 24px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.12s ease;

    &:hover {
      background-color: ${(props) => props.theme.requestTabs.icon.hoverBg};

      .close-icon {
        color: ${(props) => props.theme.requestTabs.icon.hoverColor};
      }
    }
  }

  .close-icon {
    color: ${(props) => props.theme.requestTabs.icon.color};
    width: 12px;
    height: 12px;
    transition: color 0.12s ease;
  }

  .has-changes-icon {
    width: 10px;
    height: 10px;
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

  li:hover &.has-changes {
    .draft-icon-wrapper { 
      display: none; 
    }
    .close-icon-wrapper { 
      display: flex; 
    }
  }
`;

export default StyledWrapper;

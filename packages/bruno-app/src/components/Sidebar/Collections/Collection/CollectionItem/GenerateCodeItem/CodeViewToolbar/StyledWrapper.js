import styled from 'styled-components';

const StyledWrapper = styled.div`
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: ${props => props.theme.requestTabPanel.card.bg};
    border-bottom: 1px solid ${props => props.theme.requestTabPanel.card.border};
    gap: 12px;
    flex-shrink: 0;
  }

  .left-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .select-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .select-arrow {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: ${props => props.theme.colors.text.muted};
  }

  .native-select {
    background: ${props => props.theme.requestTabPanel.url.bg};
    border: 1px solid ${props => props.theme.input.border};
    border-radius: 3px;
    color: ${props => props.theme.text};
    font-size: 12px;
    padding: 6px 28px 6px 10px;
    min-width: 140px;
    height: 32px;
    cursor: pointer;
    transition: all 0.2s ease;
    appearance: none;

    &:hover {
      border-color: ${props => props.theme.input.focusBorder};
    }

    &:focus {
      outline: none;
      border-color: ${props => props.theme.input.focusBorder};
      box-shadow: 0 0 0 2px ${props => props.theme.input.focusBoxShadow};
    }

    option {
      background: ${props => props.theme.bg};
      color: ${props => props.theme.text};
      padding: 8px 12px;
    }
  }

  .library-options {
    display: flex;
    gap: 6px;
  }

  .lib-btn {
    height: 32px;
    padding: 0 12px;
    background: ${props => props.theme.requestTabPanel.url.bg};
    border: 1px solid ${props => props.theme.input.border};
    border-radius: 3px;
    color: ${props => props.theme.text};
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;

    &:hover {
      background: ${props => props.theme.dropdown.hoverBg};
      border-color: ${props => props.theme.input.focusBorder};
    }

    &.active {
      background: ${props => props.theme.button.secondary.bg};
      border-color: ${props => props.theme.button.secondary.border};
      color: ${props => props.theme.button.secondary.color};
    }
  }

  .right-controls {
    .interpolate-checkbox {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-size: 13px;
      color: ${props => props.theme.text};

      input[type="checkbox"] {
        cursor: pointer;
        margin: 0;
      }

      &:hover {
        opacity: 0.8;
      }
    }
  }
`;

export default StyledWrapper; 
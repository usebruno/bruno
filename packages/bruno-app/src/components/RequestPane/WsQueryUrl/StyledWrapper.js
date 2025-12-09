import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 2.1rem;
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  .unified-input-container {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    border: ${(props) => props.theme.requestTabPanel.url.border};
    border-radius: ${(props) => props.theme.border.radius.base};

    input {
      background-color: ${(props) => props.theme.requestTabPanel.url.bg};
      outline: none;
      box-shadow: none;

      &:focus {
        outline: none !important;
        box-shadow: none !important;
      }
    }
  }

  .method-ws {
    color: ${(props) => props.theme.request.ws};
  }

  .connection-status-strip {
    animation: pulse 1.5s ease-in-out infinite;
    background-color: ${(props) => props.theme.colors.text.green};
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
  }

  @keyframes pulse {
    0% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.4;
    }
  }

  .infotip {
    position: relative;
    display: inline-block;
    cursor: pointer;
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.25rem;
  }

  .infotip:hover .infotip-text {
    visibility: visible;
    opacity: 1;
  }

  .infotip-text {
    visibility: hidden;
    width: auto;
    background-color: ${(props) => props.theme.requestTabs.active.bg};
    color: ${(props) => props.theme.text};
    text-align: center;
    border-radius: 4px;
    padding: 4px 8px;
    position: absolute;
    z-index: 1;
    bottom: 34px;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.3s;
    white-space: nowrap;
  }

  .infotip-text::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -4px;
    border-width: 4px;
    border-style: solid;
    border-color: ${(props) => props.theme.requestTabs.active.bg} transparent transparent transparent;
  }

  .shortcut {
    font-size: 0.625rem;
  }

  .connection-controls {
    .infotip {
      &:hover {
        background-color: ${(props) => props.theme.requestTabPanel.url.errorHoverBg};
      }
    }
  }

   .send-button, .cancel-button {
    color: white;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.base};
    width:4.5rem;
    padding-top: 0.375rem;
    padding-bottom: 0.375rem;
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.2s ease;
    outline: none;
    box-shadow: none;
    flex-shrink: 0;

    &:hover {
      opacity: 0.9;
    }

    &:active {
      opacity: 0.8;
    }

    &:focus {
      outline: none;
      box-shadow: none;
    }
  }

  .send-button {
    background: ${(props) => props.theme.requestTabPanel.url.icon};
  }

  .cancel-button {
    background: ${(props) => props.theme.requestTabPanel.url.iconDanger};
  }
`;

export default StyledWrapper;

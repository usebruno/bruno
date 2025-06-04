import styled from 'styled-components';

const Wrapper = styled.div`
  height: 2.3rem;

  .method-selector-container {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;
  }

  .input-container {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;

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

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140 140 140);
    position: relative;
    top: 1px;
  }

  .infotip {
    position: relative;
    display: inline-block;
    cursor: pointer;
  }

  .infotip:hover .infotiptext {
    visibility: visible;
    opacity: 1;
  }

  .infotiptext {
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

  .infotiptext::after {
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

  .connection-status-strip {
    animation: pulse 1.5s ease-in-out infinite;
    background-color: ${(props) => props.theme.colors.text.green};
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
  }

  /* Method dropdown styling */
  .method-dropdown {
    margin-right: 8px;
    position: relative;
    z-index: 10;
  }

  .dropdown-item {
    padding: 8px 12px;
    cursor: pointer;

    &:hover {
      background-color: ${(props) => props.theme.dropdown.hoverBg};
    }
  }
`;

export default Wrapper;

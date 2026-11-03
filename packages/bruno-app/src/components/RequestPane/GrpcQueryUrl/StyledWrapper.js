import styled from 'styled-components';

const Wrapper = styled.div`
  height: 2.1rem;
  border: ${(props) => props.theme.requestTabPanel.url.border};
  border-radius: ${(props) => props.theme.border.radius.base};

  .method-selector-container {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};
    border-top-left-radius: ${(props) => props.theme.border.radius.base};
    border-bottom-left-radius: ${(props) => props.theme.border.radius.base};
  }

  .input-container {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};
    border-top-right-radius: ${(props) => props.theme.border.radius.base};
    border-bottom-right-radius: ${(props) => props.theme.border.radius.base};

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

import styled from 'styled-components';

const Wrapper = styled.div`
  height: 2.1rem;
  border: ${(props) => props.theme.requestTabPanel.url.border};
  border-radius: ${(props) => props.theme.border.radius.base};


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
    background-color: ${(props) => props.theme.background.surface2};
    color: ${(props) => props.theme.text};
    text-align: center;
    border-radius: 4px;
    padding: 4px 8px;
    position: absolute;
    z-index: 3;
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
    border-color: ${(props) => props.theme.background.surface2} transparent transparent transparent;
  }

  .shortcut {
    font-size: 0.625rem;
  }
`;

export default Wrapper;

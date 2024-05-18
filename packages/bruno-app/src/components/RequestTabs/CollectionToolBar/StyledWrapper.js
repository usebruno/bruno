import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tooltip {
    position: relative;
    cursor: pointer;
  }

  .tooltip:hover .tooltiptext {
    visibility: visible;
    opacity: 1;
  }

  .tooltiptext {
    visibility: hidden;
    width: auto;
    background-color: ${(props) => props.theme.requestTabs.active.bg};
    color: ${(props) => props.theme.text};
    text-align: center;
    border-radius: 4px;
    padding: 4px 8px;
    position: absolute;
    z-index: 1;
    left: 50%;
    transform: translateX(-50%);
    opacity: 0;
    transition: opacity 0.3s;
    white-space: nowrap;
    top: 165%;
    user-select: none;
  }

  .tooltiptext::after {
    content: '';
    position: absolute;
    top: -8px;
    left: 50%;
    margin-left: -4px;
    border-width: 4px;
    border-style: solid;
    border-color: transparent transparent ${(props) => props.theme.requestTabs.active.bg} transparent;
  }
`;

export default StyledWrapper;

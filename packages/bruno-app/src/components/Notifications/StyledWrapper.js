import styled from 'styled-components';

const StyledWrapper = styled.button`
  position: relative;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;

  .notification-count {
    position: absolute;
    top: -4px;
    right: -6px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 14px;
    height: 14px;
    padding: 0 3px;
    color: ${(props) => props.theme.background.base};
    font-size: 9px;
    font-weight: 600;
    line-height: 1;
    border-radius: 999px;
    background-color: ${(props) => props.theme.brand};
    border: 1.5px solid ${(props) => props.theme.sidebar.bg};
    box-sizing: border-box;
    pointer-events: none;
  }
`;

export default StyledWrapper;

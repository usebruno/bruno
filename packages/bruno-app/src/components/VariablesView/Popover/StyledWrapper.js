import styled from 'styled-components';

const Wrapper = styled.div`
  position: absolute;
  min-width: fit-content;
  font-size: 14px;
  top: 36px;
  right: 0;
  white-space: nowrap;
  z-index: 1000;
  background-color: ${(props) => props.theme.variables.bg};

  .popover {
    border-radius: 2px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
  }
`;

export default Wrapper;
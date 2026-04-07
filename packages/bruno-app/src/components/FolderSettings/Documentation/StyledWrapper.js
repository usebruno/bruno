import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  overflow-y: auto;
  position: relative;

  .editing-mode {
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.yellow};
    position: sticky;
    top: 0;
    z-index: 10;
    background: ${(props) => props.theme.bg};
    padding-bottom: 0.5em;
  }
`;

export default StyledWrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  .import-button {
    background-color: ${(props) => props.theme.importEnvironment.button.bg};
    border: 2px dashed ${(props) => props.theme.importEnvironment.button.border};
    
    &:hover {
      border-color: ${(props) => props.theme.importEnvironment.button.hoverBorder};
    }
  }
`;

export default StyledWrapper;

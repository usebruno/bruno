import styled from 'styled-components';

const StyledWrapper = styled.div`
  .inheritable-label {
    color: ${(props) => props.theme.settingsInput.label};
  }

  .inheritable-description {
    color: ${(props) => props.theme.settingsInput.description};
  }

  .reset-button {
    color: ${(props) => props.theme.inheritableSettingsInput.resetButton.color};
    
    &:hover {
      color: ${(props) => props.theme.inheritableSettingsInput.resetButton.hoverColor};
    }
  }
`;

export default StyledWrapper;

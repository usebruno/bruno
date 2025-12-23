import styled from 'styled-components';

const StyledWrapper = styled.div`
  .settings-label {
    color: ${(props) => props.theme.settingsInput.label};
  }

  .settings-description {
    color: ${(props) => props.theme.settingsInput.description};
  }
`;

export default StyledWrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  .settings-heading {
    color: ${(props) => props.theme.requestPaneSettings.heading};
  }
`;

export default StyledWrapper;

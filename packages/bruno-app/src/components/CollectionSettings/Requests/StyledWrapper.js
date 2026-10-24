import styled from 'styled-components';

const StyledWrapper = styled.div`
  .http-version-field {
    display: flex;
    flex-direction: column;
  }

  .http-version-label {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
    color: ${(props) => props.theme.text};
  }

  .http-version-subtitle {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin: 0.125rem 0 0.5rem 0;
    white-space: nowrap;
  }
`;

export default StyledWrapper;

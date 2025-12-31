import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* Info icon */
  .info-icon {
    color: ${(props) => props.theme.colors.text.muted};
  }

  /* Required field asterisk */
  .required-asterisk {
    color: ${(props) => props.theme.colors.text.danger};
  }

  /* Error messages */
  .error-message {
    color: ${(props) => props.theme.colors.text.danger};
  }

  /* Checkbox */
  input[type='checkbox'] {
    cursor: pointer;
    accent-color: ${(props) => props.theme.colors.accent};
  }
`;

export default StyledWrapper;

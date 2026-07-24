import styled from 'styled-components';

const StyledWrapper = styled.div`
  .advanced-options {
    .caret {
      color: ${(props) => props.theme.textLink};
      fill: ${(props) => props.theme.textLink};
    }
  }

  .error-message {
    color: ${(props) => props.theme.colors.text.danger};
  }

  .file-extension {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .preserve-scripts-label {
    font-weight: 500;
  }

  .preserve-scripts-description {
    font-size: 0.75rem;
    color: ${(props) => props.theme.colors.text.subtext0};
    margin-top: 0.25rem;
  }
`;

export default StyledWrapper;

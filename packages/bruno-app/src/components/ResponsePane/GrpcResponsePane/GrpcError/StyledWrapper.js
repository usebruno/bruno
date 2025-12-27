import styled from 'styled-components';

const StyledWrapper = styled.div`
  border-left: 3px solid ${(props) => props.theme.colors.text.danger};
  border-radius: ${(props) => props.theme.border.radius.sm};
  max-height: 160px;
  overflow-y: auto;
  background-color: color-mix(in srgb, ${(props) => props.theme.colors.text.danger} 6%, transparent);
  margin-bottom: 8px;

  .close-button {
    opacity: 0.6;
    transition: opacity 0.15s ease;

    &:hover {
      opacity: 1;
    }

    svg {
      color: ${(props) => props.theme.colors.text.muted};
    }
  }

  .error-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    margin-bottom: 4px;
    color: ${(props) => props.theme.colors.text.danger};
  }

  .error-message {
    font-family: monospace;
    font-size: ${(props) => props.theme.font.size.xs};
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
    color: ${(props) => props.theme.text};
  }
`;

export default StyledWrapper;

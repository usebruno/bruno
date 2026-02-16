import styled from 'styled-components';

const StyledWrapper = styled.div`
  max-height: 160px;
  overflow-y: auto;
  margin-bottom: 8px;
  background-color: ${(props) => props.theme.background.base};
  border: solid 1px ${(props) => props.theme.border.border2};
  border-left: 4px solid ${(props) => props.theme.colors.text.danger};
  border-radius: ${(props) => props.theme.border.radius.base};

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

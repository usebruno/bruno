import styled from 'styled-components';

const StyledWrapper = styled.div`
  background-color: ${(props) => props.theme.bg};
  border-bottom: 1px solid ${(props) => props.theme.examples.border};

  .response-example-title {
    color: ${(props) => props.theme.text};
  }

  .response-example-description {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .primary-btn {
    background-color: ${(props) => props.theme.examples.buttonColor};
    border: 1px solid ${(props) => props.theme.examples.buttonColor};
    color: white;

    svg {
      color: ${(props) => props.theme.text} !important;
    }
  }

  .secondary-btn {
    background-color: transparent;
    color: ${(props) => props.theme.text};
    border: 1px solid ${(props) => props.theme.examples.border};

    svg {
      color: ${(props) => props.theme.text};
    }
  }

  .example-input-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: ${(props) => props.theme.text};
    margin-bottom: 4px;
  }

  .example-input {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid ${(props) => props.theme.examples.border};
    border-radius: 6px;
    background-color: transparent;
    color: ${(props) => props.theme.text};
    font-family: inherit;
    font-size: 14px;
    line-height: 1.5;
    transition: all 0.2s ease;
    outline: none;
    box-shadow: none;

    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
      outline: none;
      box-shadow: none;
    }

    &:disabled {
      background-color: transparent;
      color: ${(props) => props.theme.text};
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .example-input-name {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;

    @media (min-width: 768px) {
      font-size: 24px;
    }
  }

  .example-input-description {
    font-size: 14px;
    line-height: 1.6;
    resize: none;
    min-height: 80px;
  }
`;

export default StyledWrapper;

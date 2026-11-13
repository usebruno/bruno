import { css } from 'styled-components';

const iconInputStyles = css`
  position: relative;

  > svg {
    position: absolute;
    top: 0.5625rem;
    left: 0.625rem;
    color: ${(props) => props.theme.colors.text.muted};
    pointer-events: none;
  }

  input {
    width: 100%;
    height: 2rem;
    padding: 0 1.875rem 0 2rem;
    border: 0.0625rem solid ${(props) => props.theme.input.border};
    border-radius: ${(props) => props.theme.border.radius.base};
    outline: none;
    background: ${(props) => props.theme.input.bg};
    font: inherit;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.text};

    &::placeholder {
      color: ${(props) => props.theme.input.placeholder.color};
      opacity: ${(props) => props.theme.input.placeholder.opacity};
    }

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }
`;

export default iconInputStyles;

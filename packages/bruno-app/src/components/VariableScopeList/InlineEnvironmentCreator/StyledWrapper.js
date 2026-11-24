import styled from 'styled-components';

const StyledWrapper = styled.div`
  .scope-row.is-editing {
    gap: 0.25rem;
    padding: 0.125rem 0.25rem;
  }

  .create-env-note {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.dropdown.mutedText};
  }

  .create-env-input {
    flex: 1;
    min-width: 0;
    box-sizing: border-box;
    background: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.125rem 0.375rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.color};
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &::placeholder {
      color: ${(props) => props.theme.dropdown.mutedText};
    }
  }

  .create-env-submit {
    flex-shrink: 0;
    background: transparent;
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.125rem 0.5rem;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.dropdown.color};
    cursor: pointer;

    &:hover:not(:disabled) {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }

    &:disabled {
      cursor: default;
      color: ${(props) => props.theme.dropdown.mutedText};
    }
  }

  .create-env-error {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.danger};
    margin-top: 0.25rem;
  }
`;

export default StyledWrapper;

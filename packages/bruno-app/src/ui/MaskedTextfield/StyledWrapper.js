import styled from 'styled-components';
import { INPUT_SIZES } from 'ui/InputWrapper/constants';

const StyledWrapper = styled.div`
  .masked-textfield-wrapper {
    display: flex;
    align-items: flex-start;
    width: 100%;
    padding: ${(props) => INPUT_SIZES[props.$size || 'md'].padding};
    font-size: ${(props) => props.theme.font.size[INPUT_SIZES[props.$size || 'md'].fontSize]};
    border-radius: ${(props) => props.theme.border.radius[INPUT_SIZES[props.$size || 'md'].borderRadius]};

    &.masked-textfield-focused {
      border-color: ${(props) => props.theme.input.focusBorder} !important;
    }

    &.masked-textfield-error {
      border-color: ${(props) => props.theme.colors.text.danger} !important;
    }

    &.masked-textfield-disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .masked-textfield-field {
    outline: none;
    width: 100%;
    /* Without this the textarea's intrinsic width wins over the flex parent and overflows it. */
    min-width: 0;
    background: transparent;
    border: none;
    font-size: inherit;
    font-family: inherit;
    color: inherit;
    padding: 0;
    resize: vertical;
    /* Line breaks are part of the value, so they're preserved — but a PEM line is longer than the
       field, so it wraps rather than forcing the whole modal to scroll sideways. */
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    overflow-x: hidden;

    &:disabled {
      cursor: not-allowed;
    }
  }

  /* A textarea has no password type; text-security is what masks it in Chromium. */
  .masked-textfield-obscured {
    -webkit-text-security: disc;
  }

  .masked-textfield-toggle {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    outline: none;
    padding: 0;
    margin-left: 0.5rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.6;
    border-radius: 2px;

    &:hover {
      opacity: 1;
    }

    &:focus-visible {
      opacity: 1;
      outline: 2px solid ${(props) => props.theme.primary.solid};
      outline-offset: 1px;
    }
  }
`;

export default StyledWrapper;

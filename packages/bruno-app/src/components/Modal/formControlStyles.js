import { css } from 'styled-components';

export const textboxStyles = css`
  .textbox {
    line-height: 1.42857143;
    border: 1px solid #ccc;
    padding: 0.45rem;
    box-shadow: none;
    border-radius: 0px;
    outline: none;
    box-shadow: none;
    transition: border-color ease-in-out 0.1s;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};

    &:focus {
      border: solid 1px ${(props) => props.theme.input.focusBorder} !important;
      outline: none !important;
    }
  }

  select.textbox {
    appearance: none;
    padding-right: 30px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    cursor: pointer;
  }
`;

export const choiceInputStyles = css`
  input[type='radio'] {
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }

  input[type='checkbox'] {
    cursor: pointer;
    accent-color: ${(props) => props.theme.primary.solid};
  }

  .checkbox {
    appearance: none;
    -webkit-appearance: none;
    width: 1rem;
    height: 1rem;
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: 3px;
    background: transparent;
    position: relative;
    flex-shrink: 0;

    &:hover {
      border-color: ${(props) => props.theme.primary.solid};
    }

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.textLink};
      outline-offset: 2px;
    }

    &:checked,
    &:indeterminate {
      background: ${(props) => props.theme.button2.color.primary.bg};
      border-color: ${(props) => props.theme.button2.color.primary.border};
    }

    &:checked::after,
    &:indeterminate::after {
      content: '';
      position: absolute;
    }

    &:checked::after {
      left: 4px;
      top: 1px;
      width: 5px;
      height: 9px;
      border: solid ${(props) => props.theme.button2.color.primary.text};
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    &:indeterminate::after {
      left: 2px;
      top: 6px;
      width: 10px;
      height: 2px;
      background: ${(props) => props.theme.button2.color.primary.text};
      border-radius: 2px;
    }
  }
`;

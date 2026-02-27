import styled from 'styled-components';
import { rgba } from 'polished';

const Wrapper = styled.div`
  color: ${(props) => props.theme.text};

  &.modal--animate-out {
    animation: fade-out 0.5s forwards cubic-bezier(0.19, 1, 0.22, 1);

    .bruno-modal-card {
      animation: fade-and-slide-out-from-top 0.5s forwards cubic-bezier(0.19, 1, 0.22, 1);
    }
  }

  &.bruno-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow-y: auto;
    z-index: 20;
    background-color: rgba(0, 0, 0, 0.5);
  }

  .bruno-modal-card {
    animation-duration: 0.85s;
    animation-delay: 0.1s;
    background: ${(props) => props.theme.modal.body.bg};
    border-radius: ${(props) => props.theme.border.radius.base};
    position: relative;
    z-index: 11;
    max-width: calc(100% - var(--spacing-base-unit));
    box-shadow: var(--box-shadow-base);
    display: flex;
    flex-direction: column;
    will-change: opacity, transform;
    flex-grow: 0;
    margin: 3vh 10vw;
    margin-top: 50px;
    border: 1px solid ${(props) => props.theme.border.border0};

    &.modal-sm {
      min-width: 300px;
      max-width: 500px;
    }

    &.modal-md {
      min-width: 500px;
      max-width: 800px;
    }

    &.modal-lg {
      min-width: 800px;
      max-width: 1140px;
    }

    &.modal-xl {
      min-width: 1140px;
      max-width: calc(100% - 30px);
    }

    animation: fade-and-slide-in-from-top 0.5s forwards cubic-bezier(0.19, 1, 0.22, 1);
  }

  .bruno-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: ${(props) => props.theme.modal.title.color};
    background-color: ${(props) => props.theme.modal.title.bg};
    font-size: ${(props) => props.theme.font.size.md};
    padding: 0.5rem 1rem;
    border-top-left-radius: ${(props) => props.theme.border.radius.base};
    border-top-right-radius: ${(props) => props.theme.border.radius.base};

    .bruno-modal-header-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      margin-right: -0.5rem;
      font-size: 1.125rem;
      line-height: 1;
      color: ${(props) => props.theme.modal.title.color};
      border-radius: ${(props) => props.theme.border.radius.sm};
      opacity: 0.7;
      transition: opacity 0.2s ease, background-color 0.2s ease;

      &:hover {
        opacity: 1;
        background-color: ${(props) => rgba(props.theme.modal.title.color, 0.1)};
      }
    }
  }

  .bruno-modal-content {
    flex-grow: 1;
    background-color: ${(props) => props.theme.modal.body.bg};

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

    .bruno-form {
      color: ${(props) => props.theme.modal.body.color};
    }
  }

  .bruno-modal-backdrop {
    height: 100%;
    width: 100%;
    left: 0;
    top: 0;
    position: fixed;
    will-change: opacity;
    background: transparent;

    &:before {
      content: '';
      height: 100%;
      width: 100%;
      left: 0;
      opacity: ${(props) => props.theme.modal.backdrop.opacity};
      top: 0;
      background: black;
      position: fixed;
    }

    animation: fade-in 0.1s forwards cubic-bezier(0.19, 1, 0.22, 1);
  }

  .bruno-modal-footer {
    background-color: ${(props) => props.theme.modal.body.bg};
    border-bottom-left-radius: ${(props) => props.theme.border.radius.base};
    border-bottom-right-radius: ${(props) => props.theme.border.radius.base};
  }

  &.modal-footer-none {
    .bruno-modal-content {
      border-bottom-left-radius: ${(props) => props.theme.border.radius.base};
      border-bottom-right-radius: ${(props) => props.theme.border.radius.base};
    }
  }

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
    border: 1px solid ${(props) => props.theme.border.border2};;
    border-radius: 3px;
    background: transparent;
    position: relative;
    flex-shrink: 0;

    &:hover {
      border-color: ${(props) => props.theme.primary.solid};
    }

    &:checked {
      background: ${(props) => props.theme.button2.color.primary.bg};
      border-color: ${(props) => props.theme.button2.color.primary.border};

      &::after {
        content: '';
        position: absolute;
        left: 4px;
        top: 1px;
        width: 5px;
        height: 9px;
        border: solid ${(props) => props.theme.button2.color.primary.text};
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
  }
`;

export default Wrapper;

import styled from 'styled-components';

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
    border-radius: 6px;
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
    padding: 6px 16px;
    font-weight: 500;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    border-bottom: 1px solid ${(props) => props.theme.modal.header.borderBottom};

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
      font-size: 1.125rem;
      line-height: 1;
      color: ${(props) => props.theme.modal.title.color};
      border-radius: 4px;
      opacity: 0.7;
      transition: opacity 0.2s ease, background-color 0.2s ease;

      &:hover {
        opacity: 1;
        background-color: ${(props) => props.theme.modal.closeButton.hoverBg};
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
      border-radius: 4px;
      background-color: ${(props) => props.theme.modal.input.bg};
      border: 1px solid ${(props) => props.theme.modal.input.border};

      &:focus {
        border: solid 1px ${(props) => props.theme.modal.input.focusBorder} !important;
        outline: none !important;
      }
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
    border-bottom-left-radius: 6px;
    border-bottom-right-radius: 6px;
  }

  &.modal-footer-none {
    .bruno-modal-content {
      border-bottom-left-radius: 6px;
      border-bottom-right-radius: 6px;
    }
  }
`;

export default Wrapper;

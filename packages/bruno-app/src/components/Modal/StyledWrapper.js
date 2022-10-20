import styled from 'styled-components';

const Wrapper = styled.div`
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
    z-index: 1003;
  }

  .bruno-modal-card {
    animation-duration: 0.85s;
    animation-delay: 0.1s;
    background: var(--color-background-top);
    border-radius: var(--border-radius);
    position: relative;
    z-index: 1003;
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
    text-transform: uppercase;
    color: rgb(86 86 86);
    background-color: #f1f1f1;
    font-size: 0.75rem;
    padding: 12px;
    font-weight: 600;
    border-top-left-radius: 4px;
    border-top-right-radius: 4px;

    .close {
      font-size: 1.3rem;
      line-height: 1;
      color: #000;
      text-shadow: 0 1px 0 #fff;
      opacity: 0.5;
      margin-top: -2px;

      &:hover {
        opacity: 0.8;
      }
    }
  }

  .bruno-modal-content {
    flex-grow: 1;
    background-color: #fff;
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
      opacity: 0.4;
      top: 0;
      background: black;
      position: fixed;
    }

    animation: fade-in 0.1s forwards cubic-bezier(0.19, 1, 0.22, 1);
  }

  .bruno-modal-footer {
    background-color: white;
    border-bottom-left-radius: 3px;
    border-bottom-right-radius: 3px;
  }
`;

export default Wrapper;

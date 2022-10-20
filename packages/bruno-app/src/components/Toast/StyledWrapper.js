import styled from 'styled-components';

const Wrapper = styled.div`
  &.bruno-toast {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
  }

  .bruno-toast-card {
    -webkit-animation-duration: 0.85s;
    animation-duration: 0.85s;
    -webkit-animation-delay: 0.1s;
    animation-delay: 0.1s;
    border-radius: var(--border-radius);
    position: relative;
    max-width: calc(100% - var(--spacing-base-unit));
    margin: 3vh 10vw;

    animation: fade-and-slide-in-from-top 0.5s forwards cubic-bezier(0.19, 1, 0.22, 1);
  }

  .notification-toast-content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 5px;
    border-radius: 4px;
  }

  .alert {
    position: relative;
    padding: 0.25rem 0.75rem;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    display: flex;
    justify-content: space-between;
  }

  .alert-error {
    color: #721c24;
    background-color: #f8d7da;
    border-color: #f5c6cb;
  }

  .alert-info {
    color: #004085;
    background-color: #cce5ff;
    border-color: #b8daff;
  }

  .alert-warning {
    color: #856404;
    background-color: #fff3cd;
    border-color: #ffeeba;
  }

  .alert-success {
    color: #155724;
    background-color: #d4edda;
    border-color: #c3e6cb;
  }

  .closeToast {
    cursor: pointer;
    padding-left: 10px;
  }
`;

export default Wrapper;

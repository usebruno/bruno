import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 100vh;

  .form-container {
    max-width: 350px;
    border-radius: 4px;
    border: 1px #ddd solid;

    button.continue-btn {
      font-size: 16px;
      padding-top: 8px;
      padding-bottom: 8px;
      min-height: 38px;
      align-items: center;
      color: #212529;
      background: #e2e6ea;
      border: solid 1px #dae0e5;
    }

    .field-error {
      font-size: 0.875rem;
    }

    a {
      color: var(--color-text-link);
    }

    .or {
      display: inline-block;
      position: relative;
      top: -14px;
      background: white;
      padding-inline: 10px;
    }

    .error-msg {
      font-size: 15px;
      color: rgb(192 69 8);
    }
  }
`;

export default Wrapper;

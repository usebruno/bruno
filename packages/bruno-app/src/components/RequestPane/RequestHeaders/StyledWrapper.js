import styled from 'styled-components';

const Wrapper = styled.div`

  .btn-action {
    font-size: ${(props) => props.theme.font.size.base};
    &:hover span {
      text-decoration: underline;
    }
  }

  .actions-bar {
    position: sticky;
    bottom: 0;
    background: ${(props) => props.theme.bg};
    padding-top: 8px;
    padding-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  input[type='text'] {
    width: 100%;
    border: solid 1px transparent;
    outline: none !important;
    background-color: inherit;

    &:focus {
      outline: none !important;
      border: solid 1px transparent;
    }
  }

  input[type='checkbox'] {
    cursor: pointer;
    position: relative;
    top: 1px;
  }

  .read-only {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export default Wrapper;

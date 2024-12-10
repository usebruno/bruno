import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 0.8125rem;

  .client-credentials-secret-mode-selector {
    padding: 0.5rem 0px;
    border-radius: 3px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};

    .client-credentials-secret-label {
      width: fit-content;
      color: ${(props) => props.theme.colors.text.yellow};
      justify-content: space-between;
      padding: 0 0.5rem;
    }

    .dropdown-item {
      padding: 0.2rem 0.6rem !important;
    }
  }
`;

export default Wrapper;

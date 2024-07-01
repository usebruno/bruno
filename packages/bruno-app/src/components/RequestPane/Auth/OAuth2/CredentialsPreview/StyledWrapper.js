import styled from 'styled-components';

const Wrapper = styled.div`
  label {
    display: block;
    font-size: 0.8125rem;
  }

  textarea {
    height: fit-content;
    max-width: 400px;
    border: solid 1px ${(props) => props.theme.input.border};
    background-color: ${(props) => props.theme.input.bg};
  }
`;

export default Wrapper;

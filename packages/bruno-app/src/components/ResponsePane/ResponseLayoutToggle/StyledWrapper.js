import styled from 'styled-components';

const Wrapper = styled.div`
  button {
    display: flex;
    align-items: center;
    padding: 0.25rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default Wrapper;
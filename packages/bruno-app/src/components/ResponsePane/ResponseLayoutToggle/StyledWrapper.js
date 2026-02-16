import styled from 'styled-components';

const Wrapper = styled.div`
  button {
    display: flex;
    align-items: center;
    padding: 0.25rem;
    background: transparent;
    border: none;
    cursor: pointer;
    color: ${(props) => props.theme.dropdown.iconColor};
    border-radius: 4px;

    &:hover {
      background-color: ${(props) => props.theme.workspace.button.bg};
      color: ${(props) => props.theme.text};
    }
  }
`;

export default Wrapper;

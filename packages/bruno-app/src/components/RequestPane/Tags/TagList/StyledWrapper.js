import styled from 'styled-components';

const Wrapper = styled.div`
  input[type='text'] {
    border: solid 1px transparent;
    outline: none !important;
    background-color: inherit;

    &:focus {
      outline: none !important;
      border: solid 1px transparent;
    }
  }

  li {
    display: flex;
    align-items: center;
    border: 1px solid ${(props) => props.theme.text};
    border-radius: 5px;
    padding-inline: 5px;
    background: ${(props) => props.theme.sidebar.bg};
  }
`;

export default Wrapper;

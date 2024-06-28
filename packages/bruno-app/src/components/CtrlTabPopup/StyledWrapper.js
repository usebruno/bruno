import styled from 'styled-components';

const Wrapper = styled.dialog`
  background-color: ${(props) => props.theme.ctrlTabPopup.bg};
  color: ${(props) => props.theme.ctrlTabPopup.text};
  button:focus {
    outline: none;
    background-color: ${(props) => props.theme.ctrlTabPopup.highlightBg};
  }
`;

export default Wrapper;

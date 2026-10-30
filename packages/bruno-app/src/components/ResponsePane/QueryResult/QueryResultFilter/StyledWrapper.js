import styled from 'styled-components';

const StyledWrapper = styled.div`
  input {
    color: ${(props) => props.theme.text};
    background-color: ${(props) => props.theme.input.bg};
    border-color: ${(props) => props.theme.input.border};
  }
`;

export default StyledWrapper;

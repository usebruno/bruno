import styled from 'styled-components';

const StyledWrapper = styled.div`
  input:focus-visible + label {
    outline: 2px solid ${(props) => props.theme.textLink};
    outline-offset: 2px;
  }
`;

export default StyledWrapper;

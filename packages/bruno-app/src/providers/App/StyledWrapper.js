import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};
  background-color: ${(props) => props.theme.bg};
`;

export default StyledWrapper;

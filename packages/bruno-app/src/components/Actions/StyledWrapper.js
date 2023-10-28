import styled from 'styled-components';

const StyledWrapper = styled.div`
  border-bottom: solid 10px;
  border-top: solid 5px;
  border-color: ${(props) => props.theme.sidebar.bg};
`;

export default StyledWrapper;

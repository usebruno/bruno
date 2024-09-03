import styled from 'styled-components';

const Wrapper = styled.div`
  background-color: ${(props) => props.theme.sidebar.badge};
  color: ${(props) => props.theme.text};
`;

export default Wrapper;

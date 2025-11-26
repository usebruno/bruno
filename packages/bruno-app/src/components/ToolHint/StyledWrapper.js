import styled from 'styled-components';

const Wrapper = styled.div`
  background-color: ${(props) => props.theme?.sidebar?.badge?.bg || 'black'};
  color: ${(props) => props.theme?.text || 'white'};
`;

export default Wrapper;

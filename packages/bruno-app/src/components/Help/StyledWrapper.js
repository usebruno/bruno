import styled from 'styled-components';

const Wrapper = styled.div`
  font-weight: 400;
  font-size: ${(props) => props.theme.font.size.sm};
  background-color: ${props => props.theme.infoTip.bg};
  border: 1px solid ${props => props.theme.infoTip.border};
  box-shadow: ${props => props.theme.infoTip.boxShadow};
`;

export default Wrapper;

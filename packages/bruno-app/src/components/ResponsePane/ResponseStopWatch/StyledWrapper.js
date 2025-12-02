import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.sm};
  font-weight: 500;
  color: ${(props) => props.theme.requestTabPanel.responseStatus};
  text-align: center;
`;

export default Wrapper;

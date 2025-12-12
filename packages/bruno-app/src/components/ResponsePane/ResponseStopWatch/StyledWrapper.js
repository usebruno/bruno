import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.sm};
  font-weight: 600;
  color: ${(props) => props.theme.requestTabPanel.responseStatus};
  text-align: center;
`;

export default Wrapper;

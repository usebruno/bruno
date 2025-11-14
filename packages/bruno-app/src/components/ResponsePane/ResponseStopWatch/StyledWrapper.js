import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${(props) => props.theme.requestTabPanel.responseStatus};
  text-align: center;
`;

export default Wrapper;

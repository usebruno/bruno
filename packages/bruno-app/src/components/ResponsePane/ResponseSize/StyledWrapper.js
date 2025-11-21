import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: ${(props) => props.theme.requestTabPanel.responseStatus};
`;

export default Wrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-size: var(--font-size-body);
  color: ${(props) => props.theme.requestTabPanel.responseStatus};
`;

export default StyledWrapper;

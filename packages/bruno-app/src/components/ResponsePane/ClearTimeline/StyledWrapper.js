import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-size: 0.8125rem;
  color: ${(props) => props.theme.requestTabPanel.responseStatus};
`;

export default StyledWrapper;

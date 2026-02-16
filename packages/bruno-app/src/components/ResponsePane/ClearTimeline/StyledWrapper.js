import styled from 'styled-components';

const StyledWrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.base};
  color: ${(props) => props.theme.requestTabPanel.responseStatus};
`;

export default StyledWrapper;

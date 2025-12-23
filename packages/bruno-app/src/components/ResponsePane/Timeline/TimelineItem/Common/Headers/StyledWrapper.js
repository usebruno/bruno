import styled from 'styled-components';

const StyledWrapper = styled.div`
  .headers-header-text {
    color: ${(props) => props.theme.timelineItem.body.headerText};
  }
`;

export default StyledWrapper;

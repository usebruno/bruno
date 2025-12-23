import styled from 'styled-components';

const StyledWrapper = styled.div`
  .body-header-text {
    color: ${(props) => props.theme.timelineItem.body.headerText};
  }
`;

export default StyledWrapper;

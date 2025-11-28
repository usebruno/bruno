import styled from 'styled-components';

const StyledWrapper = styled.div`
  .advanced-options {
    .caret {
      color: ${(props) => props.theme.textLink};
      fill: ${(props) => props.theme.textLink};
    }
  }
`;

export default StyledWrapper;
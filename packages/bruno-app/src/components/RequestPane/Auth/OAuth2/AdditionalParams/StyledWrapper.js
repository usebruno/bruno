import styled from 'styled-components';

const StyledWrapper = styled.div`
  .tabs {
    .active {
      border-bottom: solid 1px ${(props) => props.theme.input.border};
    }
  }
  .additional-parameter-sends-in-selector {
    select {
      height: 32px;
    }
  }
`

export default StyledWrapper;
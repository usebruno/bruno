import styled from 'styled-components';

const StyledWrapper = styled.div`
  .variable-name {
    color: ${(props) => props.theme.variables.name.color};
  }
`

export default StyledWrapper;
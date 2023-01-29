import styled from 'styled-components';

const StyledWrapper = styled.div`
  .variable-name {
    color: ${(props) => props.theme.variables.name.color};
  }

  .variable-name{
    width:100px;
  }

  .variable-value {
    max-width: 500px;
    inline-size: 500px;
    overflow-wrap: break-word;
  }
`

export default StyledWrapper;
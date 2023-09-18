import styled from 'styled-components';

const StyledWrapper = styled.div`
  .variable-name {
    color: ${(props) => props.theme.variables.name.color};
  }

  .variable-name {
    min-width: 180px;
  }

  .variable-value {
    max-width: 600px;
    inline-size: 600px;
    overflow-wrap: break-word;
  }
`;

export default StyledWrapper;

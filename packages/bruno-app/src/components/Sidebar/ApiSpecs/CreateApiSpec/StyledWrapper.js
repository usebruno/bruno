import styled from 'styled-components';

const StyledWrapper = styled.div`
  .api-spec-file-extension {
    color: ${(props) => props.theme.colors.text.darkOrange};
  }
  select {
    background: ${(props) => props.theme.bg};
  }
  option {
    background: ${(props) => props.theme.bg};
  }
`;

export default StyledWrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  max-width: 800px;

  span.developer-mode-warning {
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.yellow};
  }
`;

export default StyledWrapper;

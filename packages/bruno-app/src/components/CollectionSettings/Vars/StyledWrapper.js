import styled from 'styled-components';

const StyledWrapper = styled.div`
  max-width: 800px;

  div.title {
    color: ${(props) => props.theme.colors.text.subtext0};
  }
`;

export default StyledWrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  .safe-mode {
    padding: 0.15rem 0.3rem;
    color: ${(props) => props.theme.colors.text.green};
    border: solid 1px ${(props) => props.theme.colors.text.green} !important;
  }
  .developer-mode {
    padding: 0.15rem 0.3rem;
    color: ${(props) => props.theme.colors.text.yellow};
    border: solid 1px ${(props) => props.theme.colors.text.yellow} !important;
  }
`;

export default StyledWrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  .safe-mode {
    padding: 0.15rem 0.4rem;
    color: ${(props) => props.theme.colors.text.green};
    border: solid 1px ${(props) => props.theme.colors.text.green} !important;
    border-radius: 4px;
    font-size: 0.75rem;
    line-height: 1rem;
  }
  .developer-mode {
    padding: 0.15rem 0.4rem;
    color: ${(props) => props.theme.colors.text.yellow};
    border: solid 1px ${(props) => props.theme.colors.text.yellow} !important;
    border-radius: 4px;
    font-size: 0.75rem;
    line-height: 1rem;
  }
`;

export default StyledWrapper;

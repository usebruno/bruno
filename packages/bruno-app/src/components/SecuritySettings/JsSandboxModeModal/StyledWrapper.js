import styled from 'styled-components';

const StyledWrapper = styled.div`
  max-width: 800px;

  span.beta-tag {
    display: flex;
    align-items: center;
    padding: 0.1rem 0.25rem;
    font-size: 0.75rem;
    border-radius: 0.25rem;
    color: ${(props) => props.theme.colors.text.green};
    border: solid 1px ${(props) => props.theme.colors.text.green} !important;
  }

  span.developer-mode-warning {
    font-weight: 400;
    color: ${(props) => props.theme.colors.text.yellow};
  }
`;

export default StyledWrapper;

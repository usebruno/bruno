import styled from 'styled-components';

const StyledWrapper = styled.div`
  .partial {
    color: ${(props) => props.theme.colors.text.yellow};
    opacity: 0.8;
  }

  .loading {
    color: ${(props) => props.theme.colors.text.muted};
    opacity: 0.8;
  }

  .completed {
    color: ${(props) => props.theme.colors.text.green};
    opacity: 0.8;
  }

  .failed {
    color: ${(props) => props.theme.colors.text.danger};
    opacity: 0.8;
  }
`;

export default StyledWrapper;

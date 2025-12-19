import styled from 'styled-components';

const StyledWrapper = styled.div`
  .loader-backdrop {
    background-color: ${(props) => props.theme.fullscreenLoader.backdrop};
  }

  .loader-card {
    background-color: ${(props) => props.theme.fullscreenLoader.card.bg};
  }

  .loader-heading {
    color: ${(props) => props.theme.fullscreenLoader.card.heading};
  }

  .loader-text {
    color: ${(props) => props.theme.fullscreenLoader.card.text};
  }
`;

export default StyledWrapper;

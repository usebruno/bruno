import styled from 'styled-components';

const StyledWrapper = styled.div`
  .info-icon-bg {
    &.blue {
      background-color: ${(props) => props.theme.collectionSettings.infoIcon.blue.bg};
    }
    &.green {
      background-color: ${(props) => props.theme.collectionSettings.infoIcon.green.bg};
    }
    &.purple {
      background-color: ${(props) => props.theme.collectionSettings.infoIcon.purple.bg};
    }
    &.indigo {
      background-color: ${(props) => props.theme.collectionSettings.infoIcon.indigo.bg};
    }
  }
`;

export default StyledWrapper;

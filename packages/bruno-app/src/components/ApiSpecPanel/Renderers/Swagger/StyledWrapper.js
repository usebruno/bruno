import styled from 'styled-components';

const StyledWrapper = styled.div`
  .swagger-root {
    height: calc(100vh - 4rem);
    border: solid 1px ${(props) => props.theme.codemirror.border};

    &.dark {
      .swagger-ui {
        filter: invert(88%) hue-rotate(180deg);
      }
      .swagger-ui .microlight {
        filter: invert(100%) hue-rotate(180deg);
      }
    }
  }
`;

export default StyledWrapper;

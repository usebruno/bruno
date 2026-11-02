import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  column-gap: 1rem;
  align-items: center;

  .settings-row-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .settings-row-label {
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.text};
    margin: 0;
  }

  .settings-row-description {
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
    margin: 0.125rem 0 0 0;
  }

  .settings-row-control {
    display: flex;
    align-items: center;
    justify-self: end;
  }
`;

export default StyledWrapper;

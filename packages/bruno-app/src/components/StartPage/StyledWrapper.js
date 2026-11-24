import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  overflow-y: auto;
  display: flex;

  .start-page {
    margin: auto;
    width: 100%;
    max-width: 720px;
    padding: 2rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .brand-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: ${(props) => props.theme.text};
  }

  .brand-tagline {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 1.5rem;
  }

  .value-points {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 0.75rem;
    margin-bottom: 2rem;
    text-align: left;
  }

  .value-point {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 0.75rem;
  }

  .value-point-title {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-weight: 500;
    color: ${(props) => props.theme.text};
    margin-bottom: 0.25rem;
  }

  .value-point-text {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .columns {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 2rem 4rem;
    text-align: left;
  }

  .section-title {
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 600;
    text-transform: uppercase;
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 0.5rem;
  }

  .create-title {
    margin-top: 2rem;
  }

  .create-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.25rem;
  }

  .create-divider {
    align-self: center;
    width: 1px;
    height: 1.25rem;
    margin: 0 0.5rem;
    background: ${(props) => props.theme.border.border1};
  }

  .create-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    color: ${(props) => props.theme.colors.text.muted};

    &:hover {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.background.surface1};
    }
  }

  .link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0;
    color: ${(props) => props.theme.textLink};

    &:hover {
      text-decoration: underline;
    }
  }
`;

export default StyledWrapper;

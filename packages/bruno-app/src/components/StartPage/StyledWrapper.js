import styled from 'styled-components';

const StyledWrapper = styled.div`
  height: 100%;
  overflow-y: auto;
  display: flex;
  justify-content: center;
  padding: 48px 24px;
  color: ${(props) => props.theme.text};

  .start-page {
    margin: auto 0;
    width: 100%;
    max-width: 730px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .brand-title {
    font-size: 28px;
    font-weight: 600;
    line-height: 1.2;
  }

  .brand-tagline {
    margin-top: 4px;
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 36px;
  }

  .value-points {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
    margin-bottom: 36px;
    text-align: left;
  }

  .value-point {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.base};
    padding: 14px 16px;
  }

  .value-point-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
    margin-bottom: 6px;

    svg {
      color: ${(props) => props.theme.brand};
    }
  }

  .value-point-text {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 1.5;
  }

  .columns {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 32px 80px;
    text-align: left;
  }

  .section-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 10px;
  }

  .create-title {
    margin-top: 32px;
  }

  .create-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 4px;
  }

  .create-divider {
    align-self: center;
    width: 1px;
    height: 18px;
    margin: 0 6px;
    background: ${(props) => props.theme.border.border1};
  }

  .create-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: ${(props) => props.theme.border.radius.base};
    color: ${(props) => props.theme.colors.text.muted};

    &:hover {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.background.surface0};
    }
  }

  .link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 0;
    color: ${(props) => props.theme.textLink};
    font-size: ${(props) => props.theme.font.size.base};

    &:hover {
      text-decoration: underline;
    }
  }
`;

export default StyledWrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .start-page-bar {
    border-bottom: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
  }

  .brand-tagline {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .value-point {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  .value-point-title svg {
    color: ${(props) => props.theme.brand};
  }

  .value-point-text {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .section-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .create-divider {
    background: ${(props) => props.theme.border.border1};
  }

  .create-button {
    border: none;
    border-radius: ${(props) => props.theme.border.radius.base};
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:hover {
      color: ${(props) => props.theme.text};
      background: ${(props) => props.theme.background.surface0};
    }
  }

  .link {
    border: none;
    background: none;
    cursor: pointer;
    color: ${(props) => props.theme.textLink};
    font-size: ${(props) => props.theme.font.size.base};

    &:hover {
      text-decoration: underline;
    }
  }
`;

export default StyledWrapper;

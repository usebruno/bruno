import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .info-card {
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => rgba(props.theme.accents.primary, 0.06)};
    border: 1px solid ${(props) => rgba(props.theme.accents.primary, 0.2)};

    .info-icon {
      color: ${(props) => props.theme.accents.primary};
    }

    .info-title {
      font-weight: 500;
      color: ${(props) => props.theme.text};
    }

    .info-description {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.muted};
      line-height: 1.5;
    }
  }

  .feature-item {
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border0};
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};

    .feature-icon {
      color: ${(props) => props.theme.colors.text.green};
    }
  }

  .note-section {
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => rgba(props.theme.colors.text.warning, 0.06)};
    border: 1px solid ${(props) => rgba(props.theme.colors.text.warning, 0.2)};
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.warning};
    line-height: 1.5;
  }
`;

export default StyledWrapper;

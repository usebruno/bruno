import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .documentation-info {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .info-card {
    display: flex;
    align-items: flex-start;
    padding: 16px;
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => rgba(props.theme.accents.primary, 0.06)};
    border: 1px solid ${(props) => rgba(props.theme.accents.primary, 0.2)};
    gap: 12px;

    .info-icon {
      flex-shrink: 0;
      color: ${(props) => props.theme.accents.primary};
    }

    .info-content {
      flex: 1;

      .info-title {
        font-weight: 500;
        margin-bottom: 4px;
        color: ${(props) => props.theme.text};
      }

      .info-description {
        font-size: ${(props) => props.theme.font.size.sm};
        color: ${(props) => props.theme.colors.text.muted};
        line-height: 1.5;
      }
    }
  }

  .features-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 8px;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.background.base};
    border: 1px solid ${(props) => props.theme.border.border0};
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.text};

    .feature-icon {
      color: ${(props) => props.theme.colors.text.green};
      flex-shrink: 0;
    }
  }

  .note-section {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 12px;
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => rgba(props.theme.colors.text.warning, 0.06)};
    border: 1px solid ${(props) => rgba(props.theme.colors.text.warning, 0.2)};
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.warning};
    line-height: 1.5;

    .note-icon {
      flex-shrink: 0;
      margin-top: 1px;
    }
  }
`;

export default StyledWrapper;

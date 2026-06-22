import styled from 'styled-components';
import { rgba } from 'polished';

const StyledWrapper = styled.div`
  .migration-section {
    padding-top: 1.5rem;
    margin-top: 1.5rem;
  }

  .icon-box.migration {
    background-color: ${(props) => rgba(props.theme.colors.text.yellow, 0.08)};
    border: 1px solid ${(props) => rgba(props.theme.colors.text.yellow, 0.09)};

    svg {
      color: ${(props) => props.theme.colors.text.yellow};
    }
  }

  .backup-section {
    border: 1px solid ${(props) => props.theme.border.border2};
    border-radius: ${(props) => props.theme.border.radius.base};
    background-color: ${(props) => props.theme.background.mantle};
    padding: 12px 14px;
  }

  .backup-section-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    color: ${(props) => props.theme.text};
  }

  .backup-section-title {
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.colors.text.muted};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .backup-section-help {
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 1.45;
    margin: 0 0 10px 0;
  }

  .backup-section-action {
    display: flex;
    justify-content: flex-start;
  }
`;

export default StyledWrapper;

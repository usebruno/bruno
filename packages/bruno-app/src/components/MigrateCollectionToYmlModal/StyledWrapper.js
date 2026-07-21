import styled from 'styled-components';

const StyledWrapper = styled.div`
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

  .migration-progress {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .migration-progress-track {
    height: 6px;
    border-radius: 3px;
    background-color: ${(props) => props.theme.background.mantle};
    overflow: hidden;
  }

  .migration-progress-fill {
    height: 100%;
    border-radius: 3px;
    background-color: ${(props) => props.theme.accents.primary};
    transition: width 0.15s ease;
  }

  .migration-progress-label {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;

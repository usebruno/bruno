import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};

  .cache-section-title {
    text-transform: uppercase;
    font-size: ${(props) => props.theme.font.size.sm};
    letter-spacing: 0.05em;
    color: ${(props) => props.theme.colors.text.muted};
    margin-bottom: 0.75rem;
  }

  .cache-item {
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    margin-bottom: 1rem;
    overflow: hidden;
  }

  .cache-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    gap: 1rem;
    background: ${(props) => props.theme.background.surface0};
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  .cache-item-title-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cache-item-title {
    font-size: ${(props) => props.theme.font.size.md};
    font-weight: 600;
  }

  .beta-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    font-size: ${(props) => props.theme.font.size.xs};
    font-weight: 500;
    line-height: 1.5;
    background: ${(props) => props.theme.status.info.background};
    color: ${(props) => props.theme.status.info.text};
  }

  .cache-item-body {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    gap: 1.25rem;
  }

  .cache-item-body-text {
    flex: 1;
    min-width: 0;
  }

  .cache-item-description {
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.colors.text.muted};
    line-height: 1.5;
    margin: 0;
  }

  .cache-item-size {
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.colors.text.subtext2};
    margin: 0.5rem 0 0 0;
  }

  .cache-item-size strong {
    font-weight: 600;
    color: ${(props) => props.theme.text};
    margin-left: 0.25rem;
  }
`;

export default StyledWrapper;

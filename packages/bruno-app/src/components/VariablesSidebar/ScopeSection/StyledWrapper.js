import styled from 'styled-components';

const StyledWrapper = styled.section`
  & + & {
    margin-top: 14px;
  }

  &.collapsed {
    padding: 4px 0;
    border-bottom: 1px solid ${(props) => props.theme.border.border1};
  }

  &.collapsed + &.collapsed {
    margin-top: 0;
  }

  .section-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 500;
    color: ${(props) => props.theme.text};
    cursor: pointer;
    user-select: none;
    border-radius: ${(props) => props.theme.border.radius.sm};

    &:hover {
      background: ${(props) => props.theme.background.surface0};
    }
  }

  .section-icon {
    flex-shrink: 0;
    color: ${(props) => props.theme.primary.text};
  }

  &.is-danger .section-icon {
    color: ${(props) => props.theme.status.danger.text};
  }

  .section-title {
    flex-shrink: 0;
    padding: 0;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    white-space: nowrap;

    &.is-link {
      cursor: pointer;

      &:hover {
        color: ${(props) => props.theme.textLink};
        text-decoration: underline;
      }
    }
  }

  .section-count {
    flex-shrink: 0;
    padding: 0 6px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: ${(props) => props.theme.background.surface0};
    color: ${(props) => props.theme.colors.text.muted};
    font-size: 11px;
    line-height: 18px;
    font-variant-numeric: tabular-nums;
  }

  &.is-danger .section-count {
    background: ${(props) => props.theme.status.danger.background};
    color: ${(props) => props.theme.status.danger.text};
  }

  .section-chevron {
    flex-shrink: 0;
    margin-left: auto;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .section-content {
    margin-top: 6px;
  }
`;

export default StyledWrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 2.25rem;
  padding: 0 0.5rem 0 0.75rem;

  & + & {
    border-top: 0.0625rem solid ${(props) => props.theme.border.border0};
  }

  > svg {
    flex: none;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .location-row-label {
    flex: 1;
    min-width: 0;
    font-size: ${(props) => props.theme.font.size.base};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &.is-path {
      font-family: var(--font-family-mono);
      font-size: ${(props) => props.theme.font.size.sm};
    }
  }

  .location-row-status {
    width: 6rem;
    flex: none;
    text-align: right;
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    white-space: nowrap;

    &.is-problem {
      color: ${(props) => props.theme.status.warning.text};
    }
  }

  .location-row-spacer {
    width: 1.5rem;
    flex: none;
  }
`;

export default StyledWrapper;

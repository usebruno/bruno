import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 1.125rem;
  padding: 0.25rem 1.25rem 1.25rem;
  overflow-y: auto;

  .locations-error {
    display: flex;
    gap: 0.5rem;
    align-items: flex-start;
    padding: 0.5625rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    background: ${(props) => props.theme.status.danger.background};
    color: ${(props) => props.theme.status.danger.text};
    font-size: ${(props) => props.theme.font.size.base};
    line-height: 1.5;

    > svg {
      flex: none;
      margin-top: 0.125rem;
    }
  }

  .locations-switch-card {
    display: flex;
    align-items: flex-start;
    gap: 1.25rem;
    padding: 0.75rem;
    border: 0.0625rem solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    cursor: pointer;

    input:focus-visible + label {
      outline: 0.125rem solid ${(props) => props.theme.textLink};
      outline-offset: 0.125rem;
    }
  }

  .locations-switch-text {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .locations-switch-title {
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 600;
  }

  .locations-switch-hint {
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .locations-section-title {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    margin-top: 0.5rem;

    h4 {
      margin: 0;
      font-size: ${(props) => props.theme.font.size.base};
      font-weight: 600;
    }
  }

  .locations-skips-info {
    display: inline-flex;
    padding: 0;
    border: 0;
    background: none;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: help;
  }

  .locations-section-hint {
    margin: 0.25rem 0 0;
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1.5;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .locations-list {
    flex: none;
    border: 0.0625rem solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    overflow: hidden;
  }

  .locations-empty {
    display: flex;
    align-items: center;
    min-height: 2.25rem;
    padding: 0 0.5rem 0 0.75rem;
    font-size: ${(props) => props.theme.font.size.base};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .locations-list-foot {
    padding: 0.5625rem 0.75rem 0.5625rem 2.3125rem;
    border-top: 0.0625rem solid ${(props) => props.theme.border.border0};
  }
`;

export default StyledWrapper;

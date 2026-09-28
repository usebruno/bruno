import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.75rem;
  background-color: ${(props) => props.theme.background.base};
  border: solid 1px ${(props) => props.theme.border.border2};
  border-radius: ${(props) => props.theme.border.radius.base};

  .info-icon {
    flex-shrink: 0;
    margin-top: 0.125rem;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .info-message {
    flex: 1;
    min-width: 0;
    line-height: 1.25rem;
    color: ${(props) => props.theme.text};
  }

  .variable-names code,
  .variable-list code {
    background-color: ${(props) => (props.theme.mode === 'light' ? props.theme.sidebar.bg : 'transparent')};
    border: solid 1px ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.base};
    font-size: 0.85em;
    padding: 0.15em 0.35em;
    font-family: monospace;
  }

  .variable-count {
    color: ${(props) => props.theme.textLink};
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: default;
  }

  .variable-popover {
    z-index: 9999 !important;
    padding: 0 !important;
    font-size: ${(props) => props.theme.font.size.sm} !important;
    color: ${(props) => props.theme.dropdown.color} !important;
    background-color: ${(props) => props.theme.dropdown.bg} !important;
    ${(props) =>
      props.theme.dropdown.shadow && props.theme.dropdown.shadow !== 'none'
        ? `box-shadow: ${props.theme.dropdown.shadow};`
        : ''}
    ${(props) =>
      props.theme.dropdown.border && props.theme.dropdown.border !== 'none'
        ? `border: 1px solid ${props.theme.dropdown.border};`
        : ''}
    border-radius: ${(props) => props.theme.border.radius.base} !important;
  }

  .popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.375rem 0.625rem 0.125rem 0.875rem;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.colors.text.muted};
  }

  .variable-list {
    box-sizing: border-box;
    max-height: 11.125rem;
    width: max-content;
    min-width: 14rem;
    max-width: min(32rem, calc(100vw - 1.875rem));
    overflow-y: auto;
    margin: 0;
    padding: 0.25rem;
    list-style: none;

    li {
      margin: 0.0625rem 0;
      padding: 0.275rem 0.625rem;
      line-height: 1.25rem;
      overflow-wrap: anywhere;
    }

    code {
      display: inline-block;
      box-sizing: border-box;
      max-width: 100%;
    }
  }

  .close-button {
    flex-shrink: 0;
  }
`;

export default StyledWrapper;

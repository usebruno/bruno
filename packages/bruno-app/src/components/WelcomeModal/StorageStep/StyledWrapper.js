import styled from 'styled-components';

const StyledWrapper = styled.div`
  .location-input-group {
    margin-bottom: 0.5rem;
  }

  .location-path-display {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    border: 1px solid ${(props) => props.theme.input.border};
    background: ${(props) => props.theme.input.bg};
    color: ${(props) => props.theme.text};
    font-size: 0.8125rem;
    line-height: 1.42857143;
    cursor: pointer;
    transition: border-color 0.15s ease;
    gap: 0.625rem;
    min-height: 38px;

    &:hover {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    .path-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .path-placeholder {
      color: ${(props) => props.theme.colors.text.subtext0};
    }

    .browse-label {
      flex-shrink: 0;
      font-size: 0.75rem;
      font-weight: 500;
      color: ${(props) => props.theme.primary.text};
    }
  }

  .location-hint {
    color: ${(props) => props.theme.colors.text.subtext0};
    font-size: 0.75rem;
    line-height: 1.4;
  }
`;

export default StyledWrapper;

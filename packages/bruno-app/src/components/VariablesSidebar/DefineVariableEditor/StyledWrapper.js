import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;

  .define-input {
    flex: 1 1 0;
    min-width: 0;
  }

  .scope-trigger {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
    padding: 2px;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:hover {
      background: ${(props) => props.theme.background.surface0};
    }
  }

  .scope-icon {
    color: ${(props) => props.theme.primary.text};
  }

  .add-to-label {
    padding: 4px 8px 2px;
    font-size: 11px;
    color: ${(props) => props.theme.colors.text.muted};
  }
`;

export default StyledWrapper;

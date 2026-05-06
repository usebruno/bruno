import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;

  &.single {
    height: 100%;

    .editor-container {
      height: calc(100% - 32px);
    }
  }

  &:not(.single) {
    min-height: 240px;
    margin-bottom: 8px;

    &.last {
      margin-bottom: 0;
    }
  }

  .message-toolbar {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
    padding: 4px 0px;
    padding-top: 0px;
    height: 32px;
    flex-shrink: 0;

    .message-label {
      font-size: ${(props) => props.theme.font.size.sm};
      color: ${(props) => props.theme.colors.text.subtext1};
      margin-right: auto;
    }

    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }

    .toolbar-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 4px;
      color: ${(props) => props.theme.colors.text.muted};
      transition: all 0.15s ease;

      &:hover {
        background-color: ${(props) => props.theme.dropdown.hoverBg};
        color: ${(props) => props.theme.text};
      }

      &.delete:hover {
        color: ${(props) => props.theme.colors.text.danger};
      }
    }
  }

  .editor-container {
    flex: 1;
    min-height: 0;
  }
`;

export default StyledWrapper;

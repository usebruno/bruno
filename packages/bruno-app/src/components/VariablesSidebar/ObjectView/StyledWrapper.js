import styled from 'styled-components';

const StyledWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  .object-breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 10px 12px;
    font-size: 12px;
  }

  .back-btn,
  .copy-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 4px;
    border: none;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background: transparent;
    color: ${(props) => props.theme.colors.text.muted};
    cursor: pointer;

    &:hover {
      background: ${(props) => props.theme.background.surface0};
      color: ${(props) => props.theme.text};
    }
  }

  .copy-btn.copied {
    color: ${(props) => props.theme.colors.text.green};
  }

  .scope-icon {
    flex-shrink: 0;
    color: ${(props) => props.theme.primary.text};
  }

  .scope-title,
  .separator {
    flex-shrink: 0;
    color: ${(props) => props.theme.colors.text.muted};
  }

  .variable-name {
    min-width: 0;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .object-editor {
    position: relative;
    flex: 1;
    min-height: 0;
    margin: 0 12px 12px;
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: ${(props) => props.theme.border.radius.md};
    overflow: hidden;

    .copy-btn {
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 5;
      background: ${(props) => props.theme.bg};
    }

    > div:last-child {
      height: 100%;
    }
  }
`;

export default StyledWrapper;

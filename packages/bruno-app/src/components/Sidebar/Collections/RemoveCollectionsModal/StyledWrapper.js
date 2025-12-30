import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 600px;
  overflow: hidden;
  box-sizing: border-box;

  .collections-list-container {
    width: 100%;
    max-height: 150px;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 4px 0;
    box-sizing: border-box;
  }

  .collections-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
  }

  .collection-tag {
    display: inline-flex;
    align-items: center;
    padding: 6px 12px;
    background-color: ${(props) => props.theme.background.surface2};
    border: 1px solid ${(props) => props.theme.requestTabs.bottomBorder};
    border-radius: 4px;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    color: ${(props) => props.theme.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .collection-tag-text {
    display: inline-block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .show-more-link,
  .show-less-link {
    display: inline-flex;
    align-items: center;

    &:hover {
      span {
        text-decoration: underline;
      }
    }
  }

  .delete-checkbox-container {
    label {
      user-select: none;
    }
    input[type='checkbox'] {
      cursor: pointer;
      width: 14px;
      height: 14px;
      accent-color: ${(props) => props.theme.colors.accent};
      vertical-align: middle;
      margin: 0;
    }
  }

  .delete-warning {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    background-color: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 4px;
    color: ${(props) => props.theme.colors.text.danger};
    font-size: ${(props) => props.theme.font.size.sm};
    line-height: 1.4;

    svg {
      flex-shrink: 0;
      margin-top: 2px;
    }

    span {
      flex: 1;
      min-width: 0;
      word-break: break-word;
    }
  }
`;

export default StyledWrapper;

import styled from 'styled-components';

const StyledWrapper = styled.div`
  width: 100%;

  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    width: 100%;
  }

  .actions-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }

  .response-search {
    flex: 1;
    min-width: 220px;
    margin-left: auto;
  }

  .response-item-icon {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .response-item-open {
    display: block;
    width: 100%;
    padding: 0;
    text-align: left;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.input.focusBorder};
      outline-offset: -2px;
      border-radius: ${(props) => props.theme.border.radius.sm};
    }
  }

  .response-item-name {
    font-weight: 500;
    font-size: ${(props) => props.theme.font.size.base};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .response-item-endpoint,
  .response-item-rules {
    font-size: ${(props) => props.theme.font.size.sm};
    color: ${(props) => props.theme.colors.text.muted};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

export default StyledWrapper;

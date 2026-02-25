import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1 1 0%;
  min-height: 0;
  overflow: hidden;
  padding-top: 4px;
  padding-bottom: 4px;

  .collections-list {
    flex: 1 1 0%;
    min-height: 0;
    padding-top: 4px;
    padding-bottom: 4px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .inline-collection-create {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    padding: 4px 8px;
    gap: 4px;

    .collection-name-input {
      flex: 1;
      min-width: 0;
      padding: 4px 8px;
      font-size: 0.8125rem;
      border: 1px solid ${(props) => props.theme.input.border};
      border-radius: ${(props) => props.theme.border.radius.sm};
      background-color: ${(props) => props.theme.input.bg};
      color: ${(props) => props.theme.text};
      outline: none;

      &:focus {
        border-color: ${(props) => props.theme.input.focusBorder};
      }
    }

    .inline-actions {
      display: flex;
      gap: 2px;
    }

    .inline-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      border-radius: ${(props) => props.theme.border.radius.sm};
      cursor: pointer;
      color: ${(props) => props.theme.colors.text.muted};

      &:hover {
        background-color: ${(props) => props.theme.sidebar.collection.item.hoverBg};
      }

      &.save:hover {
        color: ${(props) => props.theme.colors.text.green};
      }

      &.cancel:hover {
        color: ${(props) => props.theme.colors.text.danger};
      }
    }

    .inline-create-error {
      width: 100%;
      font-size: 0.75rem;
      color: ${(props) => props.theme.colors.text.danger};
      padding: 0 8px;
    }
  }
`;

export default Wrapper;

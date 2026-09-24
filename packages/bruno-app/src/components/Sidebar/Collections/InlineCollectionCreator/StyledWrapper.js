import styled from 'styled-components';

const StyledWrapper = styled.div`
  .inline-collection-creator {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 1.6rem;
    padding-left: 8px;
    padding-right: 4px;
  }

  .input-wrapper {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 3px;
    background: ${(props) => props.theme.input.bg};

    &:focus-within {
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }

  .inline-collection-input {
    font-size: 13px;
    padding: 1px 4px;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.text};
    outline: none;
    flex: 1;
    min-width: 0;
  }

  .cog-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 100%;
    border: none;
    cursor: pointer;
    background: transparent;
    color: ${(props) => props.theme.text};
    opacity: 0.5;

    &:hover {
      opacity: 1;
    }
  }

  .inline-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .inline-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    background: transparent;
    color: ${(props) => props.theme.text};

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &.save {
      color: ${(props) => props.theme.colors.text.green};
    }

    &.cancel {
      color: ${(props) => props.theme.colors.text.danger};
    }
  }
`;

export default StyledWrapper;

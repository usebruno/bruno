import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.base};
  white-space: nowrap;
  display: flex;
  align-items: center;

  .variant-selector {
    background: transparent;
    border-radius: 3px;

    .selected-variant {
      color: ${(props) => props.theme.primary.text};
    }
  }

  .add-variant-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px;
    margin-left: 4px;
    border-radius: 3px;
    color: ${(props) => props.theme.primary.text};
    cursor: pointer;
    opacity: 0.7;

    &:hover {
      opacity: 1;
      background: ${(props) => props.theme.sidebar.bg};
    }
  }

  .caret {
    color: rgb(140, 140, 140);
    fill: rgb(140, 140, 140);
  }

  .variant-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
    padding-left: 12px;

    .variant-action-btn {
      padding: 2px;
      border-radius: 3px;
      cursor: pointer;
      opacity: 0.5;
      display: flex;
      align-items: center;

      &:hover {
        opacity: 1;
      }
    }
  }
`;

export default Wrapper;

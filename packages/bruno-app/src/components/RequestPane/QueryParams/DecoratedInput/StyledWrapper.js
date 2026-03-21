import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  position: relative;

  .decorated-input-container {
    flex: 1;
    min-width: 0;
    position: relative;

    &.has-error {
      .CodeMirror,
      input,
      textarea {
        background-color: rgba(220, 53, 69, 0.08);
      }
    }
  }

  .choices-trigger {
    display: flex;
    align-items: center;
    width: 100%;
    height: 30px;
    background: transparent;
    color: inherit;
    font-size: ${(props) => props.theme.font?.size?.base || '13px'};
    font-family: Inter, sans-serif;
    cursor: pointer;
    line-height: 30px;

    .choices-value {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .choices-chevron {
      flex-shrink: 0;
      opacity: 0.5;
      margin-left: 4px;
    }

    &:hover .choices-chevron {
      opacity: 0.8;
    }

    &.error {
      color: ${(props) => props.theme.colors?.text?.danger || '#dc3545'};
    }
  }

  .choices-menu {
    min-width: 120px;
    max-height: 200px;
    overflow-y: auto;
  }
`;

export default Wrapper;

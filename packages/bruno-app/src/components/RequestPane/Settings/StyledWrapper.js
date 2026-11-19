import styled from 'styled-components';

const StyledWrapper = styled.div`
  /* Cap the list width so inline controls stay close to their labels on wide panes */
  .request-settings-list {
    max-width: 600px;
  }

  .tags-field {
    div:has(> [data-testid='tag-input']) {
      height: 34px;
      border-radius: ${(props) => props.theme.border.radius.sm};
      border: 1px solid ${(props) => props.theme.input.border};
      background-color: ${(props) => props.theme.input.bg};
      transition: border-color ease-in-out 0.1s;

      &:focus-within {
        border-color: ${(props) => props.theme.input.focusBorder};
      }
    }

    [data-testid='tag-input'] {
      height: 32px;

      .CodeMirror {
        height: 32px;
        line-height: 32px;
      }

      .CodeMirror-cursor {
        margin-top: 6px !important;
      }
    }
  }
`;

export default StyledWrapper;

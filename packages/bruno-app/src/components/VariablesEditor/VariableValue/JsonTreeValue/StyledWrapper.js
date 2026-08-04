import styled from 'styled-components';

const MONO = `ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace`;

const StyledWrapper = styled.div`
  padding: 0;
  font-family: ${MONO};
  font-size: 12px;
  line-height: 33px;
  white-space: nowrap;

  .trow {
    display: inline-flex;
    align-items: center;
    min-height: 33px;
    border-radius: 4px;

    &.expandable {
      cursor: pointer;
    }
  }

  .tchildren {
    padding-left: 16px;
    border-left: 1px solid ${(props) => props.theme.border.border0};
    margin-left: 5px;
    line-height: 1.7;
  }

  .tchildren .trow {
    min-height: 0;
    line-height: 1.7;
  }

  .caret {
    display: inline-block;
    width: 12px;
    flex-shrink: 0;
    text-align: center;
    color: ${(props) => props.theme.colors.text.muted};
    transition: transform 0.12s ease;

    &.open {
      transform: rotate(90deg);
    }
    &.leaf {
      visibility: hidden;
    }
  }

  .tkey {
    color: ${(props) => props.theme.codemirror.tokens.property};
  }
  .tsep {
    color: ${(props) => props.theme.colors.text.muted};
    margin-right: 4px;
  }

  .object-preview {
    color: ${(props) => props.theme.text};
    font-size: 12px;
  }

  .preview-key {
    color: ${(props) => props.theme.codemirror.tokens.property};
  }

  .preview-punct {
    color: ${(props) => props.theme.colors.text.muted};
  }

  .preview-type {
    color: ${(props) => props.theme.text};
    font-style: italic;
  }

  .var-ref {
    cursor: default;
  }

  .var-ref-valid {
    color: ${(props) => props.theme.codemirror.variable.valid};
  }

  .var-ref-invalid {
    color: ${(props) => props.theme.codemirror.variable.invalid};
  }

  .var-ref-prompt {
    color: ${(props) => props.theme.codemirror.variable.prompt};
  }

  .v-str {
    color: ${(props) => props.theme.codemirror.tokens.string};
  }
  .v-num {
    color: ${(props) => props.theme.codemirror.tokens.number};
  }
  .v-bool {
    color: ${(props) => props.theme.codemirror.tokens.atom};
  }
  .v-null,
  .empty-value {
    color: ${(props) => props.theme.colors.text.muted};
    font-style: italic;
  }
`;

export default StyledWrapper;

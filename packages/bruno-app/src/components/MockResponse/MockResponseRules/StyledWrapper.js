import styled from 'styled-components';

const StyledWrapper = styled.div`
  .rules-panel {
    border: 1px solid ${(props) => props.theme.table.border};
    border-radius: ${(props) => props.theme.border.radius.sm};
    padding: 12px;
    background: ${(props) => props.theme.bg.secondary || 'transparent'};

    &.embedded {
      border: none;
      border-radius: 0;
      padding: 0;
      background: transparent;
    }
  }

  .rule-row {
    display: grid;
    grid-template-columns: 110px 110px 1fr 120px 1fr auto;
    gap: 8px;
    align-items: center;
    margin-bottom: 8px;
  }

  .rule-row select,
  .rule-row input {
    width: 100%;
    min-width: 0;
    line-height: 1.42857143;
    padding: 0.45rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.input.color || 'inherit'};
    outline: none;

    &:focus {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &:disabled {
      opacity: 0.8;
    }
  }

  .rule-operator {
    line-height: 1.42857143;
    padding: 0.45rem;
    border-radius: ${(props) => props.theme.border.radius.sm};
    background-color: ${(props) => props.theme.input.bg};
    border: 1px solid ${(props) => props.theme.input.border};
    color: ${(props) => props.theme.input.color || 'inherit'};
  }

  .add-rule-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    font-size: 12px;
    border-radius: ${(props) => props.theme.border.radius.sm};
    border: 1px solid ${(props) => props.theme.table.border};
    background: transparent;
    color: inherit;
    cursor: pointer;

    &:hover {
      border-color: ${(props) => props.theme.input.focusBorder};
    }
  }
`;

export default StyledWrapper;

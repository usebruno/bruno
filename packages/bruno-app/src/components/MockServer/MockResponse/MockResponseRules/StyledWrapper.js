import styled from 'styled-components';

const StyledWrapper = styled.div`
  .add-rule-link {
    color: ${(props) => props.theme.textLink};
    cursor: pointer;
  }

  .rule-operator {
    line-height: 1.42857143;
    padding: 0.25rem 0.45rem;
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
`;

export default StyledWrapper;

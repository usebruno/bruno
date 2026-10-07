import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: inline-block;

  .response-status-input {
    background: ${(props) => props.theme.requestTabPanel.url.bg};
    border: 1px solid ${(props) => props.theme.border.border1};
    border-radius: 3px;
    padding: 0.35rem 0.6rem;
    font-size: ${(props) => props.theme.font.size.base};
    font-weight: 500;
    color: ${(props) => props.theme.text.primary};
    min-width: 160px;
    max-width: 250px;
    cursor: pointer;

    &:focus {
      outline: none;
      border-color: ${(props) => props.theme.colors.primary};
      box-shadow: 0 0 0 2px ${(props) => props.theme.colors.primary}20;
    }

    &.text-ok {
      color: ${(props) => props.theme.colors.success};
    }

    &.text-warning {
      color: ${(props) => props.theme.colors.warning};
    }

    &.text-error {
      color: ${(props) => props.theme.colors.error};
    }
  }
`;

export default StyledWrapper;

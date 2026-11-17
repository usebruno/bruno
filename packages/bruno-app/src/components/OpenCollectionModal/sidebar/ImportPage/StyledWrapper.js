import styled from 'styled-components';
import iconInputStyles from '../../components/IconInputStyles';

const StyledWrapper = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 0.25rem 1.25rem 1.25rem;
  overflow-y: auto;

  .import-url-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    > div > button {
      height: 2rem;
    }
  }

  .import-url-field {
    ${iconInputStyles}
    flex: 1;
    min-width: 0;
  }

  .import-message {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5625rem 0.75rem;
    border-radius: ${(props) => props.theme.border.radius.base};
    background: ${(props) => props.theme.status.info.background};
    font-size: 0.78125rem;
    line-height: 1.5;
    overflow-wrap: anywhere;

    > svg {
      flex: none;
      margin-top: 0.1875rem;
      color: ${(props) => props.theme.status.info.text};
    }

    &.is-ok {
      color: ${(props) => props.theme.status.success.text};
    }

    &.is-warning {
      background: ${(props) => props.theme.status.warning.background};

      > svg {
        color: ${(props) => props.theme.status.warning.text};
      }
    }
  }
`;

export default StyledWrapper;

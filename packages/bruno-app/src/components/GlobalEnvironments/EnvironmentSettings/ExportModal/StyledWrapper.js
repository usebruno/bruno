import styled from 'styled-components';

const StyledWrapper = styled.div`
  .export-message,
  .format-selection {
    margin-bottom: 1.5rem;
  }

  .format-selection,
  .export-actions {
    display: flex;
    flex-direction: row;
  }

  .format-selection {
    gap: 1.5rem;
  }

  .export-actions {
    gap: 0.75rem;
    justify-content: flex-end;
  }

  .format-option {
    display: flex;
    cursor: pointer;

    input[type="radio"] {
      margin-right: 0.5rem;
    }

    .format-label {
      user-select: none;
    }
  }

  .btn {
    padding: 0.5rem 1rem;
    cursor: pointer;
  }

  .btn-cancel {
    color: ${props => props.theme.button?.secondary?.color};
  }

  .btn-export {
    background: ${props => props.theme.button?.secondary?.bg};
    border: 1px solid ${props => props.theme.button?.secondary?.border};
  }
`;

export default StyledWrapper;

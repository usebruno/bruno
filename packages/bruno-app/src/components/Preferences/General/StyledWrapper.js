import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.text};
  font-size: 0.875rem;
  width: 100%;
  flex-grow: 1;

  .bruno-form {
    width: 100%;
  }

  .section-title {
    font-size: 0.875rem;
    letter-spacing: 0.05em;
    color: ${(props) => props.theme.colors.text.muted};
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .settings-section {
    border-bottom: 1px solid ${(props) => props.theme.input.border};
    padding-bottom: 0.25rem;
    margin-top: 0.5rem !important;

    &:first-of-type {
      margin-top: 0 !important;
    }

    &:last-of-type {
      border-bottom: none;
    }
  }

  .setting-row {
    padding-top: 0.25rem !important;
    padding-bottom: 0.25rem !important;
    border-radius: 4px;
    margin: 0 -4px;
    padding-left: 4px;
    padding-right: 4px;

    &:focus {
      outline: none;
      background-color: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    &:focus-visible {
      outline: 2px solid ${(props) => props.theme.textLink};
      outline-offset: -2px;
    }
  }

  .font-medium {
    font-size: 0.8rem;
  }

  .textbox {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
  }

  button.btn {
    padding: 0.25rem 0.75rem;
  }
`;

export default StyledWrapper;

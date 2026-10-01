import styled from 'styled-components';

const StyledWrapper = styled.div`
  color: ${(props) => props.theme.dropdown.color};
  font-size: ${(props) => props.theme.font.size.base};

  .var-set-bar {
    display: flex;
    align-items: stretch;
    width: 100%;
    background: transparent;
    border: none;
    border-radius: inherit;
    padding: 0;
    color: ${(props) => props.theme.dropdown.color};
    cursor: pointer;

    &:hover {
      background: ${(props) => props.theme.dropdown.hoverBg};
    }
  }

  .var-set-bar-label {
    display: inline-flex;
    align-items: center;
    flex: 1;
    padding: 0.4375rem 0.625rem;
    white-space: nowrap;
  }

  .var-set-bar-separator {
    width: 1px;
    margin: 0.375rem 0;
    background: ${(props) => props.theme.dropdown.separator};
    flex-shrink: 0;
  }

  .var-set-bar-dots {
    display: inline-flex;
    align-items: center;
    padding: 0.4375rem 0.5rem;
    color: ${(props) => props.theme.dropdown.mutedText};
  }
`;

export default StyledWrapper;

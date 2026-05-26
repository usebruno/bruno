import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: inline-flex;
  align-items: stretch;
  flex-shrink: 0;

  .inline-type-chip-trigger {
    display: flex;
    align-items: center;
    gap: 2px;
    height: 100%;
    padding: 0 6px;
    border: none;
    border-right: 1px solid ${(props) => props.theme.input.border};
    background: transparent;
    cursor: pointer;
    color: ${(props) => props.theme.text};

    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    }

    /* Tighten the RequestMethod min-width so the chip stays compact */
    & > div > div {
      min-width: 0;
    }
  }

  .inline-type-chip-http-badge {
    display: inline-flex;
    align-items: center;
    font-size: ${(props) => props.theme.font.size.xs};
    color: ${(props) => props.theme.text};
    text-transform: uppercase;
    margin-right: 4px;
    position: relative;
    top: 1px;
  }
`;

export default StyledWrapper;

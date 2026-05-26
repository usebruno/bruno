import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  align-items: center;
  height: 1.6rem;
  margin-top: 2px;
  /* No left padding: indent-blocks render flush like in CollectionItem;
     the bordered inner wrapper offsets itself with margin-left to align
     with the icon position (paddingLeft 8 + ml-1 4 = 12) of regular rows. */
  padding-left: 0;
  padding-right: 8px;

  .indent-block {
    border-right: 1px solid ${(props) => props.theme.sidebar.collection.item.indentBorder};
  }

  .inline-request-creator-wrapper {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    margin-left: 20px;
    border: 1px solid ${(props) => props.theme.input.border};
    border-radius: 3px;
    background: ${(props) => props.theme.input.bg};
    transition: border-color 180ms ease, background-color 180ms ease;

    &:focus-within {
      border-color: ${(props) => props.theme.input.focusBorder};
    }

    &.is-pending {
      border-color: transparent;
      background: transparent;

      .inline-type-chip-trigger {
        border-right-color: transparent;
        cursor: default;
        pointer-events: none;

        &:hover {
          background: transparent;
        }

        /* Hide the chevron — chip becomes a passive badge */
        & > svg:last-child {
          display: none;
        }
      }
    }
  }

  .inline-request-creator-pending-name {
    flex: 1;
    min-width: 0;
    padding: 0 6px;
    font-size: 13px;
    line-height: 1.6rem;
    color: ${(props) => props.theme.text};
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .inline-request-creator-input {
    font-size: 13px;
    padding: 1px 6px;
    border: none;
    background: transparent;
    color: ${(props) => props.theme.text};
    outline: none;
    flex: 1;
    min-width: 0;
  }

  .inline-request-creator-cog {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 20px;
    height: 100%;
    border: none;
    cursor: pointer;
    background: transparent;
    color: ${(props) => props.theme.text};
    opacity: 0.5;

    &:hover {
      opacity: 1;
    }
  }
`;

export default StyledWrapper;

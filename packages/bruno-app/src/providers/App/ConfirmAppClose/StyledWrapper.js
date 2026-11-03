import styled from 'styled-components';

const StyledWrapper = styled.div`
  .unsaved-items-list {
    max-height: 240px;
    overflow-y: auto;
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.base};
  }

  /* Mirrors the modal header's close button so the two controls read as one family */
  .unsaved-item-go-to-tab {
    color: ${(props) => props.theme.modal.title.color};
    opacity: 0.7;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 1;
    }
  }

  /* Wide enough for the longest method label (OPT, GRPC) so every name starts on the same column */
  .unsaved-item-icon {
    width: 36px;

    /* Only the type icons take the header color; the request method keeps its own method color */
    > svg {
      color: ${(props) => props.theme.modal.title.color};
      opacity: 0.7;
    }

    /* The sidebar method label reserves sidebar-specific width, margin and baseline offset;
       inside this fixed slot it must center like the other icons. */
    > div {
      min-width: 0;
      justify-content: center;

      > div {
        margin-right: 0;
      }

      span {
        top: 0;
      }
    }
  }
`;

export default StyledWrapper;

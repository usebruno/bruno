import styled from 'styled-components';

const StyledWrapper = styled.div`
  .unsaved-items-list {
    max-height: 240px;
    overflow-y: auto;
    border: 1px solid ${(props) => props.theme.border.border0};
    border-radius: ${(props) => props.theme.border.radius.base};
    // A non-auto scrollbar-color makes Chromium ignore the global ::-webkit-scrollbar rules,
    // so the thumb can be hidden and revealed by swapping the color alone.
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 0.2s ease;

    &:hover {
      scrollbar-color: ${(props) => props.theme.scrollbar.color} transparent;
    }
  }

  .unsaved-item-go-to-tab {
    color: ${(props) => props.theme.modal.title.color};
    opacity: 0.7;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 1;
    }
  }

  .unsaved-item-icon {
    width: 36px;

    > svg {
      color: ${(props) => props.theme.modal.title.color};
      opacity: 0.7;
    }

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

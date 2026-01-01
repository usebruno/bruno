import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.base};
  height: 100%;
  display: flex;
  align-items: stretch;
  border-radius: 4px;
  transition: background-color 0.15s ease;

  .dropdown {
    width: 100%;
    display: flex;
    align-items: stretch;
  }

  .method-selector {
    display: flex;
    align-items: center;
    margin: 2px;
    border-radius: ${(props) => props.theme.border.radius.base};

    &:not(.custom-input-mode):hover,
    &:has(button[aria-expanded="true"]) {
      background-color: color-mix(in srgb, currentColor 15%, transparent);
    }


    .tippy-box {
      max-width: 150px !important;
      min-width: 110px !important;
    }

    .dropdown-item {
      padding: 0.25rem 0.6rem !important;
    }

    .text-link {
      color: ${(props) => props.theme.textLink};
    }
  }

  input {
    background-color: ${(props) => props.theme.requestTabPanel.url.bg};
    outline: none;
    box-shadow: none;
    text-align: left;

    &:focus {
      outline: none !important;
      box-shadow: none !important;
    }
  }

  .method-span {
    display: block;
    max-width: 15ch;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
    padding: 0 8px;
    line-height: 1.5;
  }

  .caret {
    color: ${(props) => props.theme.colors.text.muted};
    fill: ${(props) => props.theme.colors.text.muted};
  }
`;

export default Wrapper;

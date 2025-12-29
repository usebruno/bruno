import styled from 'styled-components';

const Wrapper = styled.div`
  font-size: ${(props) => props.theme.font.size.base};

  .dropdown {
    width: 100%;
  }

  .method-selector {
    border-radius: 3px;

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
    width: fit-content;
    max-width: 10ch;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    display: inline-block;
    text-align: center;
    font-size: ${(props) => props.theme.font.size.sm};
    font-weight: 500;
  }
`;

export default Wrapper;

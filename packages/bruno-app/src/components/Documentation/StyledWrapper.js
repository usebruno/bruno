import styled from 'styled-components';

const StyledWrapper = styled.div`
  .editing-mode {
    cursor: pointer;
    color: ${(props) => props.theme.colors.text.yellow};
  }

  .tiptap {
    height: 100%;
    outline: none;

    :first-child {
      margin-top: 0;
    }

    /* List styles */
    ul,
    ol {
      padding: 0 1rem;
      margin: 1.25rem 1rem 1.25rem 0.4rem;
      list-style: unset;

      li {
        p {
          margin-top: 0.25em;
          margin-bottom: 0.25em;
        }
      }
    }

    ol {
      list-style-type: decimal; /* Ensure ordered lists show numbers */
    }

    /* Heading styles */
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
      line-height: 1.1;
      text-wrap: pretty;
    }

    h1 {
      font-size: 1.4rem;
      margin-top: 2.5rem;
      margin-bottom: 1.5rem;
    }

    h2 {
      font-size: 1.2rem;
      margin-top: 2.25rem;
      margin-bottom: 1.25rem;
    }

    h3 {
      font-size: 1.1rem;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }

    h4,
    h5,
    h6 {
      font-size: 1rem;
      margin-top: 1.75rem;
      margin-bottom: 0.75rem;
    }

    /* Code and preformatted text styles */
    code {
      background-color: ${(props) => props.theme.codemirror.gutter.bg};
      border-radius: 0.4rem;
      font-size: 0.85rem;
      padding: 0.25em 0.3em;
    }

    pre {
      background-color: ${(props) => props.theme.codemirror.gutter.bg};
      font-family: 'JetBrainsMono', monospace;
      margin: 1.5rem 0;
      padding: 0.75rem 1rem;

      code {
        background: none;
        color: inherit;
        font-size: 0.8rem;
        padding: 0;
      }
    }

    blockquote {
      border-left: 3px solid rgb(105, 104, 104);
      margin: 1.5rem 0;
      padding-left: 1rem;
    }

    hr {
      border: none;
      border-top: 1px solid rgb(105, 104, 104);
      margin: 2rem 0;
    }
  }

  .buttons-container {
    position: relative;

    .extra-buttons {
      display: block;
    }

    .extra-buttons-menu {
      display: none;
    }
  }

  .gradient-bg-right {
    background: linear-gradient(to right, rgb(34, 33, 33), black);
  }

  .gradient-bg-left {
    background: linear-gradient(to left, black, gray);
  }

  .no-scrollbar {
    -ms-overflow-style: none; /* Internet Explorer 10+ */
    scrollbar-width: none; /* Firefox */
  }

  .no-scroll-bar::-webkit-scrollbar {
    display: none; /* Safari and Chrome */
  }
`;

export default StyledWrapper;

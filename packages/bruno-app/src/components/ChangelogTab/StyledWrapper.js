import styled from 'styled-components';

const StyledWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  .changelog-body {
    flex: 1;
    overflow-y: auto;
    padding: 4rem 1.5rem 3rem;

    .tiptap {
      max-width: 46rem;
      margin: 0 auto;
      overflow: visible;
      font-size: ${(props) => props.theme.font?.size?.base};
      line-height: 1.65;
      color: ${(props) => props.theme.colors?.text?.subtext2};

      h2, h3, h4 {
        color: ${(props) => props.theme.primary?.text};
        border-bottom: none;
        min-height: 0;
      }

      h2 {
        margin: 0 0 0.75rem;
        padding-bottom: 0;
      }

      h3, h4 {
        margin: 1.25rem 0 0.35rem;
      }

      p {
        margin: 0.25rem 0;
        min-height: 0;
      }

      p:empty {
        display: none;
        margin: 0;
      }

      ul, ol {
        margin: 0.35rem 0;
      }

      li {
        margin: 0.1rem 0;
        min-height: 0;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        margin-left: 0.5rem;
        padding: 1px 6px;
        vertical-align: middle;
        border-radius: ${(props) => props.theme.border.radius.sm};
        font-size: ${(props) => props.theme.font.size.xs};
        font-weight: 500;
        line-height: 1.5;
        background: ${(props) => props.theme.status.info.background};
        color: ${(props) => props.theme.status.info.text};
      }

      a {
        color: ${(props) => props.theme.textLink};
        
        &:hover {
          text-decoration: underline;
        }
      }

      p:has(> a[href*='link.usebruno.com']),
      p:has(> a[href^='#preferences/']) {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-top: -0.25rem;
        font-size: ${(props) => props.theme.font?.size?.base};

        a {
          font-weight: 500;
          color: ${(props) => props.theme.textLink};
        }

        a[href*='link.usebruno.com'] {
          margin-left: auto;
        }
      }

      img {
        display: block;
        margin: 0.5rem 0 0.25rem;
        border-radius: 8px;
        border: 1px solid ${(props) => props.theme.border?.border1};
      }

      hr {
        margin: 1rem 0;
        border-top: 1px solid ${(props) => props.theme.border?.border1};
        background: none;
      }
    }
  }
`;

export default StyledWrapper;

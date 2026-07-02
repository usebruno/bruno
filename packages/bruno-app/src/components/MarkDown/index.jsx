import MarkdownIt from 'markdown-it';
import * as MarkdownItReplaceLink from 'markdown-it-replace-link';
import StyledWrapper from './StyledWrapper';
import React from 'react';
import { isValidUrl } from 'utils/url/index';
import { extendUrlWithBalancedParentheses } from 'utils/codemirror/linkAware';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';

function extendMatch(match, text) {
  const extended = extendUrlWithBalancedParentheses(match.raw, text, match.lastIndex);
  const addedSuffix = extended.url.slice(match.raw.length);
  if (!addedSuffix) return match;

  match.raw += addedSuffix;
  match.url += addedSuffix;
  match.text += addedSuffix;
  match.lastIndex = extended.lastIndex;

  return match;
}

function patchLinkifyToExtendUrls(md) {
  const originalMatchAtStart = md.linkify.matchAtStart.bind(md.linkify);
  md.linkify.matchAtStart = (text) => {
    const match = originalMatchAtStart(text);
    return match ? extendMatch(match, text) : match;
  };

  const originalMatch = md.linkify.match.bind(md.linkify);
  md.linkify.match = (text) => {
    const matches = originalMatch(text);
    return matches ? matches.map((match) => extendMatch(match, text)) : matches;
  };

  return md;
}

const Markdown = ({ collectionPath, onDoubleClick, content, allowHtml = true }) => {
  const md = useMemo(() => {
    const instance = new MarkdownIt({
      html: allowHtml,
      breaks: true,
      linkify: true,
      replaceLink: (link) => link.replace(/^\./, collectionPath)
    }).use(MarkdownItReplaceLink);

    return patchLinkifyToExtendUrls(instance);
  }, [allowHtml, collectionPath]);

  const handleOnClick = (event) => {
    const target = event.target;
    if (target.tagName === 'A') {
      event.preventDefault();
      const href = target.getAttribute('href');
      if (href && isValidUrl(href)) {
        window.open(href, '_blank');
        return;
      }
    }
  };

  const handleOnDoubleClick = (event) => {
    if (event.detail === 2) {
      onDoubleClick();
    }
  };

  const htmlFromMarkdown = useMemo(() => md.render(content || ''), [content, collectionPath, allowHtml]);
  const cleanHTML = useMemo(() => DOMPurify.sanitize(htmlFromMarkdown), [htmlFromMarkdown]);

  return (
    <StyledWrapper>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: cleanHTML }}
        onClick={handleOnClick}
        onDoubleClick={handleOnDoubleClick}
      />
    </StyledWrapper>
  );
};

export default Markdown;

/**
 *  Copyright (c) 2021 GraphQL Contributors.
 *
 *  This source code is licensed under the MIT license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import MD from 'markdown-it';

type Maybe<T> = T | null | undefined;

const md = new MD({
  // render urls as links, à la github-flavored markdown
  linkify: true
});

// NOTE(reaper): Recreate the plugin that opens links in a new window used in bruno/common
const renderLinkOpen
  = md.renderer.rules.link_open || ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank');
  tokens[idx].attrSet('rel', 'noopener noreferrer');
  return renderLinkOpen(tokens, idx, options, env, self);
};

type MarkdownContentProps = {
  markdown?: Maybe<string>;
  className?: string;
};

export default function MarkdownContent({ markdown, className }: MarkdownContentProps) {
  if (!markdown) {
    return <div />;
  }

  return <div className={className} dangerouslySetInnerHTML={{ __html: md.render(markdown) }} />;
}

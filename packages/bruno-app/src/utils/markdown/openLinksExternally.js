// force the links to open in a separate window to avoid links opening on the app window
export const openLinksExternally = (md) => {
  const renderLinkOpen = md.renderer.rules.link_open
    || ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    tokens[idx].attrSet('target', '_blank');
    tokens[idx].attrSet('rel', 'noopener noreferrer');
    return renderLinkOpen(tokens, idx, options, env, self);
  };
};

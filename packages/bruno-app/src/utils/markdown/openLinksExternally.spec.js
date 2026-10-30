import MarkdownIt from 'markdown-it';
import { openLinksExternally } from './openLinksExternally';

describe('openLinksExternally', () => {
  const md = new MarkdownIt({ linkify: true }).use(openLinksExternally);

  it('adds target and rel to markdown and linkified links', () => {
    const html = md.render('[a](https://example.com/) and https://example.org');
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(2);
  });

  it('does not render javascript: or file: links as anchors', () => {
    expect(md.render('[x](javascript:alert(1))')).not.toContain('<a');
    expect(md.render('[x](file:///etc/passwd)')).not.toContain('<a');
  });
});

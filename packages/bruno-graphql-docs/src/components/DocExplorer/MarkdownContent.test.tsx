import MarkdownContent from './MarkdownContent';

describe('MarkdownContent', () => {
  it('opens schema description links in a new window', () => {
    const el = MarkdownContent({ markdown: '[docs](https://example.com/)' });
    const html = el.props.dangerouslySetInnerHTML.__html;
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('https://example.com/');
  });

  it('does not render javascript: or file: links as anchors', () => {
    expect(MarkdownContent({ markdown: '[x](javascript:alert(1))' }).props.dangerouslySetInnerHTML.__html).not.toContain('<a');
    expect(MarkdownContent({ markdown: '[x](file:///etc/passwd)' }).props.dangerouslySetInnerHTML.__html).not.toContain('<a');
  });
});

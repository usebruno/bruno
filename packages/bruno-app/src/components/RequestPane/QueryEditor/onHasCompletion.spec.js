/**
 * @jest-environment jsdom
 */
import CodeMirror from 'codemirror';
import onHasCompletion from './onHasCompletion';

jest.mock('codemirror', () => ({
  on: jest.fn()
}));

const selectHint = (ctx) => {
  const data = {};
  onHasCompletion(null, data);
  const select = CodeMirror.on.mock.calls[0][2];
  const el = document.createElement('li');
  const hintsUl = document.createElement('ul');
  hintsUl.appendChild(el);
  select(ctx, el);
  return hintsUl.querySelector('.CodeMirror-hint-information');
};

describe('onHasCompletion schema description links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens description links in a new window', () => {
    const information = selectHint({ description: '[a](https://example.com/)' });
    expect(information.innerHTML).toContain('target="_blank"');
    expect(information.innerHTML).toContain('rel="noopener noreferrer"');
    expect(information.innerHTML).toContain('https://example.com/');
  });

  it('does not render javascript: links as anchors', () => {
    const information = selectHint({ description: '[x](javascript:alert(1))' });
    expect(information.innerHTML).not.toContain('<a');
  });
});

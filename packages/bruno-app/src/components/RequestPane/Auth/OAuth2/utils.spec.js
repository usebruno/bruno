import { removeLineBreaks } from './utils';

describe('removeLineBreaks', () => {
  it('removes CRLF, CR, and LF line breaks', () => {
    expect(removeLineBreaks('first\r\nsecond\rthird\nfourth')).toBe('firstsecondthirdfourth');
  });

  it('preserves values without line breaks', () => {
    expect(removeLineBreaks('client secret')).toBe('client secret');
  });

  it('preserves non-text input values', () => {
    expect(removeLineBreaks(false)).toBe(false);
  });
});
